import {type FC, useEffect, useMemo, useRef, useState} from "react";
import type {RequireEncryptionKey} from "@/utils/cryptography.ts";
import type {ProjectPartitionDto} from "@/dto/tenant/PartitionDto.ts";
import {createApi} from "@/api.ts";
import type {KanbanBoardDto, KanbanBoardEditFormDto} from "@/dto/pm/KanbanBoardDto.ts";
import type {AxiosInstance} from "axios";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import {notifyApiError} from "@/utils/errors.ts";
import {formatQueryParameters} from "@/utils/format.ts";
import type {PageDto} from "@/dto/PageDto.ts";
import {Button} from "@/components/ui/button.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {Pen, PenOff, Plus, Users} from "lucide-react";
import type {BlockingFC} from "@/utils/misc.ts";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Drawer, DrawerContent, DrawerHeader, DrawerTitle} from "@/components/ui/drawer.tsx";
import KanbanBoardEditForm from "@/interfaces/components/KanbanBoardEditForm.tsx";
import {toast} from "sonner";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion.tsx";
import {Link} from "react-router";
import {encodedListingPath} from "@/utils/path.ts";
import {useTenant} from "@/contexts/TenantContext.tsx";
import type {TaskStatusDto, TaskStatusesDto} from "@/dto/pm/TaskStatusDto.ts";
import {cn} from "@/lib/utils.ts";
import {KanbanBoard, KanbanHeader, KanbanProvider} from "@/components/ui/shadcn-io/kanban";
import {Input} from "@/components/ui/input.tsx";

const toKanbanColumns = (statuses: TaskStatusDto[]) => {
    return statuses.map(s => ({
        id: `${s.id}`,
        name: s.statusName,
        color: '#F59E0B'
    }))
}

const BoardAccordion: FC<{
    api: AxiosInstance,
    project: ProjectPartitionDto,
    board: KanbanBoardDto,
}> = ({ api, project, board }) => {
    const [isLoading, setIsLoading] = useState(true)
    const [editOn, setEditOn] = useState(false)
    const [statuses, setStatuses] = useState([] as TaskStatusDto[])
    const columns = useMemo(() => {
        if (!editOn){
            return toKanbanColumns(statuses)
        }

        return [...toKanbanColumns(statuses), {
            id: '-1',
            name: '',
            color: '',
        }]
    }, [statuses, editOn])

    const loadStatuses = async () => {
        try {
            setIsLoading(true)
            const response = await api.get(formatQueryParameters('pm/tasks/statuses', {
                kanbanBoardId: board.id
            }))
            setStatuses((response.data as TaskStatusesDto).taskStatuses)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadStatuses().then(undefined)
    }, []);

    const AddButton = () => {
        const [isOn, setIsOn] = useState(false)
        const inputRef = useRef<HTMLInputElement | null>(null)

        useEffect(() => {
            if (isOn && inputRef.current){
                inputRef.current.focus()
            }
        }, [isOn, inputRef]);

        const handleKeyDown = (e: {key: string}) => {
            if (e.key !== "Escape") {
                return
            }

            setIsOn(false)
        };

        return isOn
            ? <Input ref={inputRef} className={'max-w-52'} onKeyDown={handleKeyDown}/>
            : <Button variant={'outline'} className={'cursor-pointer max-w-52'} onClick={() => setIsOn(true)}>
                <Plus/>
                Add status
        </Button>
    }

    if (isLoading){
        return <div className={'w-full h-20 flex flex-col justify-center'}>
            <FullSizeSpinner/>
        </div>
    }

    return <div className={'w-full flex flex-col py-2 gap-4'}>
        <div className={"w-full flex flex-row gap-2"}>
            { project.permissions.includes("WRITE") && <Button className={cn('cursor-pointer', editOn ? 'text-background bg-foreground hover:text-foreground hover:bg-background' : 'text-foreground border-dashed border-2 border-foreground hover:border-solid hover:text-background hover:bg-foreground')}
                                                               onClick={() => setEditOn(o => !o)}
                                                               disabled={isLoading}>
                { editOn ? <PenOff/> : <Pen/> }
                <span>Toggle edit mode</span>
            </Button> }
        </div>
        {(!statuses.length && !editOn) && <div className={'w-full h-20 flex flex-col justify-center text-center text-xl font-semibold'}>
            This board is empty
        </div>}
        {(statuses.length || editOn) && <KanbanProvider columns={columns} data={[]} className={'min-h-20'}>
            {(column) => column.id === '-1'
                ? <AddButton/>
                : <KanbanBoard id={column.id} key={column.id} className={"max-w-fit min-w-52"}>
                    <KanbanHeader>
                        <div className="flex items-center gap-2">
                            <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: column.color }}
                            />
                            <span>{column.name}</span>
                        </div>
                    </KanbanHeader>
                </KanbanBoard>}
        </KanbanProvider>}
    </div>
}

const BoardSelector: FC<BlockingFC & {
    api: AxiosInstance,
    project: ProjectPartitionDto,
}> = ({ api, project, isLoading, setIsLoading }) => {
    const [openItem, setOpenItem] = useState(undefined as string | undefined);
    const [allBoards, setAllBoards] = useState([] as KanbanBoardDto[])

    useEffect(() => {
        queryAllBoards().then(undefined)
    }, []);

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
            <FullSizeSpinner/>
        </div>
    }

    return <>
        <Accordion type="single"
                   value={openItem}
                   onValueChange={setOpenItem}
                   collapsible>
            {allBoards.map((b, i) => <AccordionItem key={i} value={`${b.id}`}>
                <AccordionTrigger className={'cursor-pointer'}>
                    <p className={'text-2xl font-bold'}>
                        {b.boardName}
                    </p>
                </AccordionTrigger>
                <AccordionContent>
                    {openItem === `${b.id}` && <BoardAccordion api={api} board={b} project={project}/>}
                </AccordionContent>
            </AccordionItem>)}
        </Accordion>
    </>
}

const ProjectOverviewPageKanbanBoards: FC<RequireEncryptionKey & {
    project: ProjectPartitionDto
}> = ({ project }) => {
    const [openCreationDialog, setOpenCreationDialog] = useState(false)
    const [counter, setCounter] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const {tenantId} = useTenant()
    const partitionIdRef = useRef(null as number | null)
    const api = createApi(partitionIdRef)
    const isDesktop = useMediaQuery("(min-width: 768px)")

    useEffect(() => {
        partitionIdRef.current = project.id
    }, [project]);

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
                        <span>{ project.permissions.includes("MODERATE") ? "Manage partition" : "Partition members" }</span>
                    </Link>
                </Button>
                { project.permissions.includes("WRITE") && <Button className={"text-foreground border-dashed border-2 border-foreground cursor-pointer hover:border-solid hover:text-background hover:bg-foreground"}
                                                                      onClick={() => setOpenCreationDialog(true)}
                                                                      disabled={isLoading}>
                    { isLoading ? <Spinner/> : <Plus/> }
                    <span>Add board</span>
                </Button> }
            </div>
            <BoardSelector key={counter} api={api} project={project} isLoading={isLoading} setIsLoading={setIsLoading}/>
        </div>
    </>
}

export default ProjectOverviewPageKanbanBoards