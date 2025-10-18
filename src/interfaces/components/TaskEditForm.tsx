import {type ChangeEvent, type FC, type HTMLAttributes, type SyntheticEvent, useEffect, useMemo, useState} from "react";
import type {KanbanBoardDto} from "@/dto/pm/KanbanBoardDto.ts";
import type {Callback} from "@/utils/misc.ts";
import type {TaskStatusDto, TaskStatusesDto} from "@/dto/pm/TaskStatusDto.ts";
import {ALL_TASK_PRIORITIES, humanizeTaskPriority, type TaskPriority} from "@/dto/pm/TaskDto.ts";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import type {ProjectPartitionDto} from "@/dto/tenant/PartitionDto.ts";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {ArrowLeft, Check, ChevronsUpDown, MessageSquare, Plus, Save, SquareArrowOutUpRight} from "lucide-react";
import {Command, CommandGroup, CommandItem} from "@/components/ui/command.tsx";
import {formatQueryParameters} from "@/utils/format.ts";
import {notifyApiError} from "@/utils/errors.ts";
import type {AxiosInstance} from "axios";
import type {PageDto} from "@/dto/PageDto.ts";
import {cn} from "@/lib/utils.ts";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {MinimalTiptap} from "@/components/ui/shadcn-io/minimal-tiptap";
import {toast} from "sonner";
import type {UserInfoDto} from "@/dto/user/UserInfoDto.ts";
import {digestSha256, encryptAESGCM, uint8ArrayToBase64} from "@/utils/cryptography.ts";
import type {CipherDto} from "@/dto/cryptography/CipherDto.ts";
import MemberDebouncedSearchField from "@/interfaces/components/MemberDebouncedSearchField.tsx";
import {useTenant} from "@/contexts/TenantContext.tsx";
import type {PartitionUserDto} from "@/dto/tenant/PartitionUserDto.ts";
import TaskCommentsList from "@/interfaces/components/TaskCommentsList.tsx";
import {createApi} from "@/api.ts";
import type {CountDto} from "@/dto/CountDto.ts";
import {encodedListingPath} from "@/utils/path.ts";

export type CreateOrEditTaskDto = {
    taskId?: string,
    project?: ProjectPartitionDto,
    kanbanBoard?: KanbanBoardDto,
    taskStatus?: TaskStatusDto,
    taskPriority?: TaskPriority,
    reporter?: UserInfoDto,
    assignee?: UserInfoDto,
    name: string,
    content?: string,
}

export type EditTaskDto = CreateOrEditTaskDto & {
    taskId: string,
}

export interface TaskEditFormProps<T extends CreateOrEditTaskDto> {
    isLoading: boolean,
    api: AxiosInstance,
    partitionKey: CryptoKey,
    form?: T,
    showComments?: boolean,
    onSave: Callback<T>
}

export type PatchTaskProps = {
    api: AxiosInstance,
    partitionKey: CryptoKey,
    task: EditTaskDto,
    editTaskForm: CreateOrEditTaskDto
}

const tenantApi = createApi(null);

export async function patchTask({api, task, partitionKey}: PatchTaskProps){
    const encoder = new TextEncoder()
    const partitionChecksum = uint8ArrayToBase64(await digestSha256(new Uint8Array(await crypto.subtle.exportKey("raw", partitionKey))))
    let encryptedName: CipherDto
    let encryptedContent: CipherDto | undefined = undefined
    {
        const {iv, cipherText} = await encryptAESGCM({
            content: encoder.encode(task.name),
            key: partitionKey
        })

        encryptedName = {
            decryptionMethod: "UNWRAPPED_PARTITION_KEY",
            iv: uint8ArrayToBase64(iv),
            cipher: uint8ArrayToBase64(cipherText)
        }
    }
    if (task.content){
        const {iv, cipherText} = await encryptAESGCM({
            content: encoder.encode(task.content),
            key: partitionKey
        })

        encryptedContent = {
            decryptionMethod: "UNWRAPPED_PARTITION_KEY",
            iv: uint8ArrayToBase64(iv),
            cipher: uint8ArrayToBase64(cipherText)
        }
    }

    await api.patch('pm/tasks', {
        taskId: task.taskId,
        kanbanBoardId: task.kanbanBoard?.id,
        assigneeEmail: task.assignee?.email,
        reporterEmail: task.reporter?.email,
        taskPriority: task.taskPriority,
        encryptedName,
        encryptedContent,
        partitionChecksum,
    })
}

function MemberInfoCard({member}: {member: UserInfoDto}){
    return <table className={''}>
        <thead>
            <tr>
                <td></td>
            </tr>
        </thead>
        <tbody>
            {(member.firstName && member.lastName) && <tr>
                <td className={'flex w-full text-xs'}>{member.firstName} {member.lastName}</td>
            </tr>}
            <tr>
                <td className={'text-muted-foreground text-xs'}>{member.email}</td>
            </tr>
        </tbody>
    </table>
}

function TaskEditForm<T extends CreateOrEditTaskDto = CreateOrEditTaskDto>({ partitionKey, showComments, api, isLoading: parentIsLoading, form, onSave }: TaskEditFormProps<T>) {
    const [formValues, setFormValues] = useState(form ? form : { name: '' } as T)
    const [commentMode, setCommentMode] = useState(false)
    const [kanbanSearch, setKanbanSearch] = useState(false)
    const [statusSearch, setStatusSearch] = useState(false)
    const [prioritySearch, setPrioritySearch] = useState(false)
    const [localIsLoading, setLocalIsLoading] = useState(false)
    const [selectedBoardId, setSelectedBoardId] = useState(null as null | number)
    const [statuses, setStatuses] = useState([] as TaskStatusDto[])
    const [allBoards, setAllBoards] = useState([] as KanbanBoardDto[])
    const [commentCount, setCommentCount] = useState(0)
    const isLoading = useMemo(() => parentIsLoading || localIsLoading, [parentIsLoading, localIsLoading])
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const {activeTenant, tenantId} = useTenant()
    const canListTenantMembers = useMemo(() => !!activeTenant &&
            (activeTenant.membership === "OWNER" ||
                activeTenant.permissions.includes("LIST_USERS")),
        [activeTenant])

    const handleChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { id, value, type, checked } = e.target;
        setFormValues((prev) => ({
            ...prev,
            [id]:
                type === 'checkbox'
                    ? checked
                    : value,
        }));
    }

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        if (!formValues.name){
            toast.error("No task's name specified")
            return
        }
        if (!formValues.project){
            toast.error("No project specified")
            return;
        }
        onSave({
            ...formValues,
            kanbanBoard: formValues.project ? formValues.kanbanBoard : undefined,
            taskStatus: formValues.kanbanBoard ? formValues.taskStatus : undefined,
            content: formValues.content === '<p></p>' ? undefined : formValues.content });
    }

    const loadBoards = async () => {
        try {
            setLocalIsLoading(true)
            const response = await api.get(formatQueryParameters('pm/kanban', {
                page: 1,
                pageSize: 1000
            }))

            setAllBoards((response.data as PageDto<KanbanBoardDto>).items)
        } catch (e){
            notifyApiError(e)
        } finally {
            setLocalIsLoading(false)
        }
    }

    const loadStatuses = async (boardId: number) => {
        try {
            setLocalIsLoading(true)
            const response = await api.get(formatQueryParameters('pm/tasks/statuses', {
                kanbanBoardId: boardId
            }))
            setStatuses((response.data as TaskStatusesDto).taskStatuses)
        } catch (e){
            notifyApiError(e)
        } finally {
            setLocalIsLoading(false)
        }
    }

    const searchMembers = async (contentTerms: string) => {
        const response = await api.get(formatQueryParameters('partitions/members', {
            contentTerms,
            page: 1,
            pageSize: 10,
            orderBy: 'lastName'
        }))
        return (response.data as PageDto<PartitionUserDto>).items
    }

    const loadCommentCount = async () => {
        if (!formValues.taskId){
            return
        }
        try {
            setLocalIsLoading(true)
            const response = await tenantApi.get(formatQueryParameters('pm/tasks/comments/count', {
                taskId: formValues.taskId
            }))

            const {count} = response.data as CountDto
            setCommentCount(count)
        } catch (e){
            notifyApiError(e)
        } finally {
            setLocalIsLoading(false)
        }
    }

    useEffect(() => {
        loadBoards()
            .then(loadCommentCount)
    }, []);

    useEffect(() => {
        if (formValues.project?.id && formValues.project.id !== form?.project?.id){
            loadBoards().then(undefined)
        }
        setFormValues(form ? form : { name: '' } as T)
    }, [form]);

    useEffect(() => {
        setCommentMode(false)
    }, [isDesktop]);

    useEffect(() => {
        setKanbanSearch(false)
        setStatusSearch(false)
        setPrioritySearch(false)
        setSelectedBoardId(formValues?.kanbanBoard?.id ?? null)
    }, [formValues]);

    useEffect(() => {
        if (selectedBoardId){
            loadStatuses(selectedBoardId).then(undefined)
        } else {
            setStatuses([])
        }
    }, [selectedBoardId]);

    const MainGrid: FC<HTMLAttributes<HTMLDivElement>> = ({className, ...props}) => {
        return <div className={cn("grid gap-2", className)} {...props}>
            <div className="flex flex-row gap-2">
                <Label className="w-16">Project:</Label>
                <Input
                    className="flex-1 border-foreground"
                    value={formValues.project?.uniqueIdentifier}
                    id="project"
                    required
                    readOnly
                />
                {formValues.project && formValues.taskId && <div className={'flex flex-col justify-center'}>
                    <a href={`/tenant/${tenantId}/project/overview/${encodedListingPath(formValues.project.partitionPath)}`} target={'_blank'}>
                        <SquareArrowOutUpRight size={16}/>
                    </a>
                </div>}
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-16">Board:</Label>
                <Input
                    className="flex-1 border-foreground hidden"
                    value={formValues.kanbanBoard?.boardName}
                    id="kanbanBoard"
                    readOnly
                />
                <Popover open={kanbanSearch} onOpenChange={setKanbanSearch}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={kanbanSearch}
                            className="flex-1 justify-between"
                            disabled={!!formValues.taskId || isLoading || !formValues.project}
                        >
                            {formValues.kanbanBoard
                                ? formValues.kanbanBoard.boardName
                                : "No board"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-0">
                        <Command>
                            <CommandGroup>
                                <CommandItem
                                    key={0}
                                    className={"cursor-pointer truncate overflow-hidden whitespace-nowrap text-muted-foreground"}
                                    onSelect={() => {
                                        setFormValues(f => ({
                                            ...f,
                                            kanbanBoard: undefined,
                                            taskStatus: undefined
                                        }))
                                    }}
                                >
                                    No board
                                </CommandItem>
                                {allBoards.map((value, i) => (<CommandItem key={i + 1}
                                                                           className={"cursor-pointer truncate overflow-hidden whitespace-nowrap"}
                                                                           onSelect={() => {
                                                                               setFormValues(f => ({
                                                                                   ...f,
                                                                                   kanbanBoard: value
                                                                               }))
                                                                           }}>
                                    {value.boardName}
                                    <Check
                                        className={cn(
                                            "ml-auto",
                                            value.id === formValues.kanbanBoard?.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
                {formValues.project && formValues.kanbanBoard && formValues.taskId && <div className={'flex flex-col justify-center'}>
                    <a href={formatQueryParameters(`/tenant/${tenantId}/project/overview/${encodedListingPath(formValues.project.partitionPath)}`, {board: formValues.kanbanBoard.id})} target={'_blank'}>
                        <SquareArrowOutUpRight size={16}/>
                    </a>
                </div>}
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-16">Status:</Label>
                <Input
                    className="flex-1 border-foreground hidden"
                    value={formValues.taskStatus?.statusName}
                    id="taskStatus"
                    readOnly
                />
                <Popover open={statusSearch} onOpenChange={setStatusSearch}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={statusSearch}
                            className="flex-1 justify-between"
                            disabled={isLoading || !formValues.kanbanBoard}
                        >
                            {formValues.taskStatus
                                ? formValues.taskStatus.statusName
                                : "Backlog"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-0">
                        <Command>
                            <CommandGroup>
                                <CommandItem
                                    key={0}
                                    className={"cursor-pointer truncate overflow-hidden whitespace-nowrap text-muted-foreground"}
                                    onSelect={() => {
                                        setFormValues(f => ({
                                            ...f,
                                            taskStatus: undefined
                                        }))
                                    }}
                                >
                                    Backlog
                                </CommandItem>
                                {statuses.map((value, i) => (<CommandItem key={i + 1}
                                                                          className={"cursor-pointer truncate overflow-hidden whitespace-nowrap"}
                                                                          onSelect={() => {
                                                                              setFormValues(f => ({
                                                                                  ...f,
                                                                                  taskStatus: value
                                                                              }))
                                                                          }}>
                                    {value.statusName}
                                    <Check
                                        className={cn(
                                            "ml-auto",
                                            value.id === formValues.taskStatus?.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-16">Priority:</Label>
                <Input
                    className="flex-1 border-foreground hidden"
                    value={formValues.taskPriority}
                    id="kanbanBoard"
                    required
                    readOnly
                />
                <Popover open={prioritySearch} onOpenChange={setPrioritySearch}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={statusSearch}
                            className="flex-1 justify-between"
                            disabled={isLoading}
                        >
                            {formValues.taskPriority
                                ? humanizeTaskPriority(formValues.taskPriority)
                                : "Default"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-0">
                        <Command>
                            <CommandGroup>
                                <CommandItem
                                    key={0}
                                    className={"cursor-pointer truncate overflow-hidden whitespace-nowrap text-muted-foreground"}
                                    onSelect={() => {
                                        setFormValues(f => ({
                                            ...f,
                                            taskPriority: undefined
                                        }))
                                    }}
                                >
                                    Default
                                </CommandItem>
                                {ALL_TASK_PRIORITIES.map((value, i) => (<CommandItem key={i + 1}
                                                                                     className={"cursor-pointer truncate overflow-hidden whitespace-nowrap"}
                                                                                     onSelect={() => {
                                                                                         setFormValues(f => ({
                                                                                             ...f,
                                                                                             taskPriority: value
                                                                                         }))
                                                                                     }}>
                                    {humanizeTaskPriority(value)}
                                    <Check
                                        className={cn(
                                            "ml-auto",
                                            value === formValues.taskPriority ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            {formValues.taskId && <>
                <div className="flex flex-row gap-2">
                    <Label className="w-16">Assignee:</Label>
                    <MemberDebouncedSearchField value={formValues.assignee?.email} onChange={(v => setFormValues(f => ({
                        ...f,
                        assignee: !v ? undefined : typeof v === 'string' ? {email: v} : v
                    })))} onSearch={canListTenantMembers ? searchMembers : undefined}>
                        <MemberDebouncedSearchField.Trigger>
                            {formValues.assignee && <MemberInfoCard member={formValues.assignee}/>}
                        </MemberDebouncedSearchField.Trigger>
                    </MemberDebouncedSearchField>
                </div>
                <div className="flex flex-row gap-2">
                    <Label className="w-16">Reporter:</Label>
                    <MemberDebouncedSearchField value={formValues.reporter?.email} onChange={(v => setFormValues(f => ({
                        ...f,
                        reporter: !v ? undefined : typeof v === 'string' ? {email: v} : v
                    })))} onSearch={canListTenantMembers ? searchMembers : undefined}>
                        <MemberDebouncedSearchField.Trigger>
                            {formValues.reporter && <MemberInfoCard member={formValues.reporter}/>}
                        </MemberDebouncedSearchField.Trigger>
                    </MemberDebouncedSearchField>
                </div>
            </>}
        </div>
    }

    return <div>
        {isDesktop
            ? <>
                <div className={'flex flex-row w-full gap-12'}>
                    <div className={'w-full flex flex-col gap-2'}>
                        <div className="flex flex-row gap-2">
                            <Label>Name:</Label>
                            <Input
                                className="flex-1 border-foreground"
                                value={formValues.name}
                                onChange={handleChange}
                                id="name"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <MinimalTiptap content={formValues.content} onChange={content => setFormValues(f => ({
                            ...f,
                            content
                        }))}/>
                        {formValues.taskId && <>
                            <Label className={cn('mt-4 text-2xl', showComments && 'font-bold')}>
                                Comments
                                <span className={'text-muted-foreground font-normal text-xl'}>
                                    ({commentCount})
                                </span>
                            </Label>
                            {showComments && <TaskCommentsList partitionKey={partitionKey}
                                                               onCommentSubmitted={loadCommentCount}
                                                               className={'mt-4'}
                                                               taskId={formValues.taskId}/>}
                        </>}
                    </div>
                    <div className={"w-80"}>
                        <MainGrid/>
                        <div className={'mt-2 w-full flex flex-col-reverse'}>
                            <Button disabled={isLoading}
                                    type={"submit"}
                                    onClick={handleSubmit}
                                    className={'flex flex-grow w-full border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                                {formValues.taskId
                                    ? <>
                                        <Save/>
                                        Save
                                    </>
                                    : <>
                                        <Plus/>
                                        Create
                                    </>}
                            </Button>
                        </div>
                    </div>
                </div>
            </>
            : <>
                { showComments && commentMode && formValues.taskId
                    ? <>
                        <Button className={'mt-2 flex flex-grow w-full border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}
                                onClick={() => setCommentMode(false)}>
                            <ArrowLeft/>
                            Task details
                        </Button>
                        <TaskCommentsList partitionKey={partitionKey}
                                          onCommentSubmitted={loadCommentCount}
                                          className={'mt-4'}
                                          taskId={formValues.taskId}/>
                    </>
                    : <>
                        <div className="flex flex-row gap-2 mb-2">
                            <Label className="w-16">Name:</Label>
                            <Input
                                className="flex-1 border-foreground"
                                value={formValues.name}
                                onChange={handleChange}
                                id="name"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <MainGrid/>
                        <div className={'mt-2'}>
                            <MinimalTiptap content={formValues.content} onChange={content => setFormValues(f => ({
                                ...f,
                                content
                            }))}/>
                        </div>
                        {showComments && formValues.taskId && <Button className={'mt-2 flex flex-grow w-full border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}
                                                      onClick={() => setCommentMode(true)}
                                                      disabled={isLoading}>
                            <MessageSquare/>
                            <span>
                                Comments
                                <span className={'text-muted-foreground font-normal'}>
                                    {` (${commentCount})`}
                                </span>
                            </span>
                        </Button>}
                        <Button disabled={isLoading}
                                type={"submit"}
                                onClick={handleSubmit}
                                className={'mt-2 flex flex-grow w-full border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                            {formValues.taskId
                                ? <>
                                    <Save/>
                                    Save
                                </>
                                : <>
                                    <Plus/>
                                    Create
                                </>}
                        </Button>
                    </> }
            </>}
    </div>
}

export default TaskEditForm