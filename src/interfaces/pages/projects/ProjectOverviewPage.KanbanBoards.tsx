import {type FC, useEffect, useMemo, useRef, useState} from "react";
import {
    base64ToUint8Array,
    decryptWithPrivateKey,
    digestSha256,
    tryDecryptText,
    uint8ArrayToBase64,
    type RequireEncryptionKey, encryptAESGCM,
} from "@/utils/cryptography.ts";
import type {ProjectPartitionDto} from "@/dto/tenant/PartitionDto.ts";
import {createApi} from "@/api.ts";
import type {KanbanBoardDto, KanbanBoardEditFormDto} from "@/dto/pm/KanbanBoardDto.ts";
import type {AxiosInstance} from "axios";
import {notifyApiError} from "@/utils/errors.ts";
import {formatQueryParameters} from "@/utils/format.ts";
import type {PageDto} from "@/dto/PageDto.ts";
import {Button} from "@/components/ui/button.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {Pen, PenOff, Plus, Split, SquareArrowOutUpRight, User, Users} from "lucide-react";
import type {BlockingFC} from "@/utils/misc.ts";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Drawer, DrawerContent, DrawerHeader, DrawerTitle} from "@/components/ui/drawer.tsx";
import KanbanBoardEditForm from "@/interfaces/components/KanbanBoardEditForm.tsx";
import {toast} from "sonner";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion.tsx";
import {Link, useSearchParams} from "react-router";
import {encodedListingPath, getAvatarSource} from "@/utils/path.ts";
import {useTenant} from "@/contexts/TenantContext.tsx";
import type {TaskStatusDto, TaskStatusesDto} from "@/dto/pm/TaskStatusDto.ts";
import {cn} from "@/lib/utils.ts";
import {KanbanBoard, KanbanCard, KanbanCards, KanbanHeader, KanbanProvider} from "@/components/ui/shadcn-io/kanban";
import {Input} from "@/components/ui/input.tsx";
import type {TaskCardDto, TaskCardsDto, TaskDto} from "@/dto/pm/TaskDto.ts";
import TaskEditForm, {
    type CreateOrEditTaskDto,
    type EditTaskDto,
    patchTask
} from "@/interfaces/components/TaskEditForm.tsx";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar.tsx";
import type {UserInfoDto} from "@/dto/user/UserInfoDto.ts";
import type {DragEndEvent} from "@dnd-kit/core";
import type {IdDto} from "@/dto/IdDto.ts";
import {h64} from "xxhashjs"
import type {CipherDto} from "@/dto/cryptography/CipherDto.ts";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import {useKeyManager} from "@/contexts/KeyManagerContext.tsx";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";

type RequirePartitionKey = {
    partitionKey: CryptoKey
}

type KanbanTaskCardDto = {
    id: string,
    ticketId: string,
    name: string,
    column: string,
    encryptedNameHash: number,
    assignee?: UserInfoDto,
}

const toKanbanColumns = (statuses: TaskStatusDto[]) => {
    return statuses.map(s => ({
        id: `${s.id}`,
        name: s.statusName,
        color: '#F59E0B'
    }))
}

const decryptKanbanCards = async (newCards: TaskCardDto[], oldCards: KanbanTaskCardDto[], backlogId: string, partitionKey: CryptoKey) => {
    const decrypted = [] as KanbanTaskCardDto[]
    const cachedDecryption = Object.fromEntries(oldCards.map(c => [c.id, c]))
    for (const taskCard of newCards) {
        const nameHash = h64(`${taskCard.encryptedName.iv}|${taskCard.encryptedName.cipher}`, 0).toNumber()
        if (cachedDecryption[taskCard.id] && cachedDecryption[taskCard.id].encryptedNameHash === nameHash){
            decrypted.push(cachedDecryption[taskCard.id])
            continue
        }
        const text = await tryDecryptText(partitionKey, taskCard.encryptedName.cipher, base64ToUint8Array(taskCard.encryptedName.iv!))
        decrypted.push({
            id: `${taskCard.id}`,
            ticketId: taskCard.taskIdentifier,
            name: text,
            column: taskCard.taskStatusId ? `${taskCard.taskStatusId}` : backlogId,
            encryptedNameHash: nameHash,
            assignee: taskCard.assignee,
        })
    }

    return decrypted
}

const squaredMagnitude = (vector: { x: number, y : number }): number => {
    const {x, y} = vector
    return (x * x) + (y * y)
}

const getTaskHrefSimple = (tenantId: number, taskId: string) => {
    return `/tenant/${tenantId}/task/${taskId}`
}

const getTaskHref = async (tenantId: number, taskId: string, key: Uint8Array | undefined, privateKey: CryptoKey) => {
    if (!key) {
        return getTaskHrefSimple(tenantId, taskId)
    }

    const extractedKey = new Uint8Array(await crypto.subtle.exportKey('pkcs8', privateKey))
    const {iv, cipherText} = await encryptAESGCM({
        key,
        content: extractedKey,
    })

    return formatQueryParameters(getTaskHrefSimple(tenantId, taskId), {
        'x-ptf-wrapped-ekey': uint8ArrayToBase64(cipherText),
        'x-ptf-wrapped-nonce': uint8ArrayToBase64(iv),
    })
}

const BoardAccordion: FC<RequirePartitionKey & {
    api: AxiosInstance,
    project: ProjectPartitionDto,
    board: KanbanBoardDto,
}> = ({ api, project, board, partitionKey }) => {
    const [backlogId, setBacklogId] = useState('auto-backlog')
    const [isLoading, setIsLoading] = useState(true)
    const [taskEditLoading, setTaskEditLoading] = useState(false)
    const [taskEditOpened, setTaskEditOpened] = useState(false)
    const [searchParams, setSearchParams] = useSearchParams()
    const [editOn, setEditOn] = useState(false)
    const [statuses, setStatuses] = useState([] as TaskStatusDto[])
    const [tasks, setTasks] = useState([] as TaskCardDto[])
    const [taskCards, setTaskCards] = useState([] as KanbanTaskCardDto[])
    const [taskHref, setTaskHref] = useState('#')
    const {getOrCreateEphemeralSymmetricKey} = useKeyManager()
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const {tenantId} = useTenant()
    const {userPrivateKey} = useAuthorization()
    const [editTaskForm, setEditTaskForm] = useState({project, kanbanBoard: board, name: ''} as CreateOrEditTaskDto)
    const taskIdPreset = useMemo(() => searchParams.get('task'), [searchParams])
    const columns = useMemo(() => {
        let columns = toKanbanColumns(statuses)
        if (editOn){
            columns = [
                ...columns,
                {
                    id: 'add',
                    name: '',
                    color: '',
                }
            ]
        }
        if (editOn && backlogId === 'auto-backlog'){
            return columns
        }
        if (backlogId === 'auto-backlog'){
            columns = [
                {
                    id: backlogId,
                    name: 'Backlog',
                    color: '#6B7280',
                },
                ...columns
            ]
        }

        const [backlog] = columns.filter(c => c.id === backlogId)
        if (backlog){
            backlog.color = '#6B7280'
            columns = [
                backlog,
                ...columns.filter(c => c.id !== backlogId)
            ]
        }

        return columns
    }, [backlogId, statuses, editOn])

    const loadStatuses = async () => {
        try {
            setIsLoading(true)
            const response = await api.get(formatQueryParameters('pm/tasks/statuses', {
                kanbanBoardId: board.id
            }))

            const s = (response.data as TaskStatusesDto).taskStatuses
            const [backlog] = s.filter(status => status.stereotype === 'BACKLOG')
            setBacklogId(backlog ? `${backlog.id}` : 'auto-backlog')

            setStatuses(s)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const loadTasks = async () => {
        try {
            setIsLoading(true)
            const response = await api.get(formatQueryParameters('pm/tasks/by-board', {
                kanbanBoardId: board.id
            }))
            setTasks((response.data as TaskCardsDto).tasks)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const createTask = async (task: CreateOrEditTaskDto) => {
        const encoder = new TextEncoder()
        const encryptedName = await encryptAESGCM({
            content: encoder.encode(task.name),
            key: partitionKey
        })
        const encryptedContent = task.content ? await encryptAESGCM({
            content: encoder.encode(task.content),
            key: partitionKey
        }) : null
        const partitionChecksum = uint8ArrayToBase64(await digestSha256(new Uint8Array(await crypto.subtle.exportKey("raw", partitionKey))))
        const response = await api.post('pm/tasks', {
            kanbanBoardId: task.kanbanBoard?.id,
            taskStatusId: task.taskStatus?.id,
            taskPriority: task.taskPriority,
            encryptedName: {
                decryptionMethod: "UNWRAPPED_PARTITION_KEY",
                iv: uint8ArrayToBase64(encryptedName.iv),
                cipher: uint8ArrayToBase64(encryptedName.cipherText)
            } as CipherDto,
            encryptedContent: encryptedContent ? {
                decryptionMethod: "UNWRAPPED_PARTITION_KEY",
                iv: uint8ArrayToBase64(encryptedContent.iv),
                cipher: uint8ArrayToBase64(encryptedContent.cipherText)
            } as CipherDto : undefined,
            partitionChecksum,
        })

        setTaskEditOpened(false)
        await loadTasks()
        const ticketId = (response.data as IdDto).id as string
        setSearchParams(s => {
            const params = new URLSearchParams(s)
            params.set('task', ticketId)
            return params
        })
    }

    const editTask = async (task: EditTaskDto) => {
        await patchTask({
            api,
            task,
            editTaskForm,
            partitionKey,
        })
        setTaskEditOpened(false)
        toast.success("Task saved successfully")
        setSearchParams(s => {
            const params = new URLSearchParams(s)
            params.delete('task')
            return params
        })
        await loadTasks()
    }

    const createOrEditTask = async (task: CreateOrEditTaskDto) => {
        try {
            setIsLoading(true)

            if (task.taskId){
                await editTask(task as EditTaskDto)
            } else {
                await createTask(task)
            }
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const openCard = async (selectedCard: KanbanTaskCardDto) => {
        try {
            setTaskEditLoading(true)

            const response = await api.get(formatQueryParameters('pm/tasks/task',{
                taskId: selectedCard.ticketId
            }))
            const task = response.data as TaskDto
            const content = await tryDecryptText(partitionKey,
                task.encryptedContent?.cipher,
                task.encryptedContent?.iv ? base64ToUint8Array(task.encryptedContent.iv) : undefined)
            setEditTaskForm({
                taskId: selectedCard.ticketId,
                project,
                kanbanBoard: board,
                name: selectedCard.name,
                content,
                taskStatus: task.taskStatus,
                taskPriority: task.priority,
                reporter: task.reporter,
                assignee: task.assignee,
            })

            setTaskEditOpened(true)
        } catch (e) {
            notifyApiError(e)
        } finally {
            setTaskEditLoading(false)
        }
    }

    const onDragEnd = async (event: DragEndEvent) => {
        const {delta} = event
        const ms = squaredMagnitude(delta)
        if (ms > 64){
            return
        }

        const [selectedCard] = taskCards.filter(c => c.id === event.active.id);
        if (!selectedCard){
            console.error('Card not found:', event.active.id)
            return
        }

        setSearchParams(s => {
            const params = new URLSearchParams(s)
            params.set('task', selectedCard.ticketId)
            return params
        })
    }

    const refreshTasks = () => loadStatuses().then(loadTasks)

    const setOpenEditForm = (o: boolean) => {
        if (!o){
            setEditTaskForm({project, kanbanBoard: board, name: ''})
            setSearchParams(s => {
                const params = new URLSearchParams(s)
                params.delete('task')
                return params
            })
        } else {
            setTaskEditOpened(o)
        }

    }

    useEffect(() => {
        refreshTasks().then(undefined)
    }, []);

    useEffect(() => {
        decryptKanbanCards(tasks, taskCards, backlogId, partitionKey).then(setTaskCards)
    }, [tasks, backlogId, partitionKey]);

    useEffect(() => {
        if (!taskIdPreset){
            return
        }

        const [selectedCard] = taskCards.filter(c => c.ticketId === taskIdPreset);
        if (!selectedCard){
            return
        }

        openCard(selectedCard).then(undefined)
    }, [taskIdPreset, taskCards]);

    useEffect(() => {
        if (!editTaskForm?.taskId){
            setTaskHref('#')
            return
        }

        const taskId = editTaskForm.taskId
        setTaskHref(getTaskHrefSimple(tenantId!, taskId))
        getOrCreateEphemeralSymmetricKey()
            .then(k => getTaskHref(tenantId!, taskId, base64ToUint8Array(k.key), userPrivateKey!))
            .then(setTaskHref)
    }, [editTaskForm]);

    const AddStatusButton = () => {
        const [isOn, setIsOn] = useState(false)
        const [localLoading, setLocalLoading] = useState(false)
        const inputRef = useRef<HTMLInputElement | null>(null)

        useEffect(() => {
            if (isOn && inputRef.current){
                inputRef.current.focus()
            }
        }, [isOn, inputRef]);

        const createStatus = async () => {
            if (!inputRef.current){
                toast.error('Please reload the page')
                return
            }

            const statusName = inputRef.current.value
            try {
                setLocalLoading(true)
                await api.post('pm/tasks/statuses', {
                    statusName,
                    kanbanBoardId: board.id
                })
                setIsOn(false)
                loadStatuses().then(undefined)
            } catch (e) {
                inputRef.current?.focus()
                notifyApiError(e)
            } finally {
                setLocalLoading(false)
            }
        }

        const handleKeyDown = (e: {key: string}) => {
            if (e.key === "Escape") {
                setIsOn(false)
                return
            }
            if (e.key === 'Enter'){
                if (!inputRef.current?.value){
                    setIsOn(false)
                    return
                }
                createStatus().then(undefined)
                return
            }
        }

        return <>
            <Input ref={inputRef}
                   className={cn('task-status-min-width task-status-edit-max-width', !isOn && 'hidden')}
                   onKeyDown={handleKeyDown}
                   placeholder={"Status name"}
                   disabled={localLoading}/>
            <Button variant={'outline'}
                    className={cn('cursor-pointer task-status-min-width task-status-edit-max-width', isOn && 'hidden')}
                    onClick={() => setIsOn(true)}
                    disabled={localLoading}>
                <Plus/>
                Add status
            </Button>
        </>
    }

    if (isLoading && !taskCards.length){
        return <div className={'w-full h-20 flex flex-col justify-center'}>
            <FullSizeSpinner/>
        </div>
    }

    return <>
        {isDesktop ? <Dialog open={taskEditOpened} onOpenChange={setOpenEditForm}>
            <DialogContent className="sm:max-w-4/5">
                <DialogHeader>
                    <DialogTitle>
                        {!editTaskForm.taskId
                            ? "Create task"
                            : <p className={'w-full flex flex-row min-w-fit text-center gap-1'}>
                                {editTaskForm.taskId}
                                <a href={taskHref} target={'_blank'}>
                                    <SquareArrowOutUpRight size={16}/>
                                </a>
                            </p>}
                    </DialogTitle>
                </DialogHeader>
                <div className={"w-full"}>
                    {taskEditLoading
                        ? <></>
                        : <TaskEditForm api={api}
                                        partitionKey={partitionKey}
                                        isLoading={isLoading}
                                        onSave={createOrEditTask}
                                        form={editTaskForm}/>}
                </div>
            </DialogContent>
        </Dialog> : <Drawer open={taskEditOpened} onOpenChange={setOpenEditForm}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>
                        {!editTaskForm.taskId
                            ? "Create task"
                            : <p className={'w-full flex flex-row min-w-fit text-center gap-1 justify-center'}>
                                {editTaskForm.taskId}
                                <a href={`/tenant/${tenantId}/task/${editTaskForm.taskId}`} target={'_blank'}>
                                    <SquareArrowOutUpRight size={18}/>
                                </a>
                            </p>}
                    </DrawerTitle>
                </DrawerHeader>
                <div className={'w-full px-3 pb-3'}>
                    {taskEditLoading
                        ? <></>
                        : <TaskEditForm api={api}
                                        partitionKey={partitionKey}
                                        isLoading={isLoading}
                                        onSave={createOrEditTask}
                                        form={editTaskForm}/>}
                </div>
            </DrawerContent>
        </Drawer>}
        <div className={'w-full flex flex-col py-2 gap-4'}>
            <div className={"w-full flex flex-row gap-1"}>
                <Button className={'text-foreground border-dashed border-2 border-foreground cursor-pointer hover:border-solid hover:text-background hover:bg-foreground'}
                        onClick={() => setTaskEditOpened(true)}>
                    <Plus/>
                    Create task
                </Button>
                { project.permissions.includes("WRITE") && <>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button className={cn('cursor-pointer', editOn ? 'text-background bg-primary hover:text-primary hover:bg-background' : 'text-foreground hover:text-background hover:bg-foreground')}
                                    onClick={() => setEditOn(o => !o)}
                                    disabled={isLoading}>
                                { editOn ? <PenOff/> : <Pen/> }
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{editOn ? 'Exit' : 'Enter'} edit mode</TooltipContent>
                    </Tooltip>
                    {editOn && <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button className={'cursor-pointer text-foreground hover:text-background hover:bg-foreground'} asChild>
                                    <Link to={formatQueryParameters(`/tenant/${tenantId}/project/progression/${encodedListingPath(project.partitionPath)}`, {
                                        board: board.id
                                    })}>
                                        <Split/>
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Task progression</TooltipContent>
                        </Tooltip>
                    </>}
                </> }
            </div>
            <div className={'w-full'}>
                <div className={'overflow-x-auto'}>
                    <KanbanProvider columns={columns} data={taskCards} className={''} onDragEnd={onDragEnd}>
                        {(column) => column.id === 'add'
                            ? <AddStatusButton/>
                            : <KanbanBoard id={column.id} key={column.id} className={"max-w-fit task-status-min-width"}>
                                <KanbanHeader>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: column.color }}
                                        />
                                        <span>{column.name}</span>
                                    </div>
                                    {editOn && <div className={'flex gap-1 mt-1'}>
                                            <Button variant={"outline"} className={'flex-1 cursor-pointer'}>Edit</Button>
                                            <Button variant={"destructive"} className={'flex-1 cursor-pointer'}>Delete</Button>
                                        </div>}
                                </KanbanHeader>
                                <KanbanCards id={column.id}>
                                    {(feature: KanbanTaskCardDto) => (
                                        <KanbanCard
                                            column={column.id}
                                            id={feature.id}
                                            key={feature.id}
                                            name={feature.name}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <p className="m-0 flex-1 font-medium text-sm">
                                                        {feature.name}
                                                    </p>
                                                </div>
                                                <Avatar className="h-4 w-4 shrink-0">
                                                    {feature.assignee
                                                        ? <Avatar className="h-4 w-4 shrink-0">
                                                            <AvatarImage src={getAvatarSource(feature.assignee.avatarToken, 100)}/>
                                                            <AvatarFallback>
                                                                {feature.assignee.firstName[0]}{feature.assignee.lastName[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        : <Avatar className="h-4 w-4 shrink-0">
                                                            <AvatarFallback>
                                                                <User/>
                                                            </AvatarFallback>
                                                        </Avatar>}
                                                </Avatar>
                                            </div>
                                            <p className="m-0 text-muted-foreground text-xs">
                                                {feature.ticketId}
                                                {" • "}
                                                {feature.assignee ? `${feature.assignee.firstName} ${feature.assignee.lastName}` : "Unassigned"}
                                            </p>
                                        </KanbanCard>
                                    )}
                                </KanbanCards>
                            </KanbanBoard>}
                    </KanbanProvider>
                </div>
            </div>
        </div>
    </>
}

const BoardSelector: FC<BlockingFC & RequirePartitionKey & {
    api: AxiosInstance,
    project: ProjectPartitionDto,
}> = ({ api, project, isLoading, setIsLoading, partitionKey }) => {
    const [openItem, setOpenItem] = useState(undefined as string | undefined);
    const [allBoards, setAllBoards] = useState([] as KanbanBoardDto[])
    const [searchParams, setSearchParams] = useSearchParams()
    const boardIdPreset = useMemo(() => {
        return searchParams.get("board") ?? undefined
    }, [searchParams])

    useEffect(() => {
        queryAllBoards().then(undefined)
    }, []);

    useEffect(() => {
        setOpenItem(boardIdPreset)
    }, [boardIdPreset]);

    const queryAllBoards = async () => {
        try {
            setIsLoading(true)

            const response = await api.get(formatQueryParameters('pm/kanban', {
                page: 1,
                pageSize: 1000
            }))

            setAllBoards((response.data as PageDto<KanbanBoardDto>).items)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading){
        return <div className={'w-full h-24 flex flex-col justify-center'}>
            <></>
        </div>
    }

    const accordionSet = (id: string) => {
        if (id === boardIdPreset){
            return
        }
        if (id) {
            setSearchParams(s => {
                const params = new URLSearchParams(s)
                params.set('board', id)
                return params
            })
        } else {
            setSearchParams(s => {
                const params = new URLSearchParams(s)
                params.delete('board')
                return params
            })
            setOpenItem(undefined)
        }
    }

    return <>
        <Accordion type="single"
                   value={openItem}
                   onValueChange={accordionSet}
                   collapsible>
            {allBoards.map((b, i) => <AccordionItem key={i} value={`${b.id}`}>
                <AccordionTrigger className={'cursor-pointer'} disabled={isLoading}>
                    <p className={'text-2xl font-bold'}>
                        {b.boardName}
                    </p>
                </AccordionTrigger>
                <AccordionContent>
                    {openItem === `${b.id}` && <BoardAccordion api={api} board={b} project={project} partitionKey={partitionKey}/>}
                </AccordionContent>
            </AccordionItem>)}
        </Accordion>
    </>
}

const ProjectOverviewPageKanbanBoards: FC<RequireEncryptionKey & {
    project: ProjectPartitionDto
}> = ({ project, userPrivateKey }) => {
    const [openCreationDialog, setOpenCreationDialog] = useState(false)
    const [counter, setCounter] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [partitionKey, setPartitionKey] = useState(null as CryptoKey | null)
    const {tenantId} = useTenant()
    const partitionIdRef = useRef(null as number | null)
    const api = createApi(partitionIdRef)
    const isDesktop = useMediaQuery("(min-width: 768px)")

    const decryptPartitionKey = async () => {
        try {
            setIsLoading(true)

            const key = await decryptWithPrivateKey(userPrivateKey, base64ToUint8Array(project.userPartitionKey.cipher))
            const decryptedPartitionKey = await crypto.subtle.importKey(
                "raw",
                key,
                { name: "AES-GCM" },
                true,
                ["encrypt", "decrypt"]
            )
            setPartitionKey(decryptedPartitionKey)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        partitionIdRef.current = project.id
    }, [project]);

    useEffect(() => {
        decryptPartitionKey().then(undefined)
    }, [project, userPrivateKey]);

    const onCreate = async (form: KanbanBoardEditFormDto) => {
        try {
            setIsLoading(true)
            await api.post('pm/kanban', form)

            setOpenCreationDialog(false)
            setCounter(c => c + 1)
            toast.success("Board created")
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const CreationForm = () => {
        return <KanbanBoardEditForm isLoading={isLoading} onSave={onCreate}/>
    }

    return <>
        {isDesktop ? <Dialog open={openCreationDialog} onOpenChange={setOpenCreationDialog}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create a new Kanban board</DialogTitle>
                </DialogHeader>
                <div className={'w-full'}>
                    <CreationForm/>
                </div>
            </DialogContent>
        </Dialog> : <Drawer open={openCreationDialog} onOpenChange={setOpenCreationDialog}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Create a new Kanban board</DrawerTitle>
                </DrawerHeader>
                <div className={'w-full pb-3 px-3'}>
                    <CreationForm/>
                </div>
            </DrawerContent>
        </Drawer>}
        <div className={"w-full gap-2 mt-2"}>
            <div className={"flex gap-2"}>
                <Button className={"text-background bg-primary border-2 border-primary cursor-pointer hover:text-primary hover:bg-background"}
                        disabled={isLoading}
                        asChild>
                    <Link to={`/tenant/${tenantId}/partitions/members/${encodedListingPath(project.partitionPath)}`}>
                        { isLoading ? <Spinner/> : <Users/> }
                        <span>{ project.permissions.includes("MODERATE") ? "Manage project" : "Project members" }</span>
                    </Link>
                </Button>
                { project.permissions.includes("WRITE") && <Button className={"text-foreground border-dashed border-2 border-foreground cursor-pointer hover:border-solid hover:text-background hover:bg-foreground"}
                                                                      onClick={() => setOpenCreationDialog(true)}
                                                                      disabled={isLoading}>
                    { isLoading ? <Spinner/> : <Plus/> }
                    <span>Add board</span>
                </Button> }
            </div>
            {partitionKey && <BoardSelector key={counter} api={api} project={project} isLoading={isLoading} setIsLoading={setIsLoading} partitionKey={partitionKey}/>}
        </div>
    </>
}

export default ProjectOverviewPageKanbanBoards