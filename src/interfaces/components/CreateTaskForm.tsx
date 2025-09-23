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
import {Check, ChevronsUpDown} from "lucide-react";
import {Command, CommandGroup, CommandItem} from "@/components/ui/command.tsx";
import {formatQueryParameters} from "@/utils/format.ts";
import {notifyApiError} from "@/utils/errors.ts";
import type {AxiosInstance} from "axios";
import type {PageDto} from "@/dto/PageDto.ts";
import {cn} from "@/lib/utils.ts";
import useMediaQuery from "@/hooks/use-media-query.tsx";

export type CreateTaskDto = {
    project?: ProjectPartitionDto,
    kanbanBoard?: KanbanBoardDto,
    taskStatus?: TaskStatusDto,
    taskPriority?: TaskPriority,
    name: string,
    content?: string
}

const CreateTaskForm: FC<{
    isLoading: boolean,
    api: AxiosInstance,
    form?: CreateTaskDto,
    onSave: Callback<CreateTaskDto>
}> = ({ api, isLoading: parentIsLoading, form, onSave }) => {
    const [formValues, setFormValues] = useState(form ? form : { name: '' })
    const [kanbanSearch, setKanbanSearch] = useState(false)
    const [statusSearch, setStatusSearch] = useState(false)
    const [prioritySearch, setPrioritySearch] = useState(false)
    const [localIsLoading, setLocalIsLoading] = useState(false)
    const isLoading = useMemo(() => parentIsLoading || localIsLoading, [parentIsLoading, localIsLoading])
    const [selectedBoardId, setSelectedBoardId] = useState(null as null | number)
    const [statuses, setStatuses] = useState([] as TaskStatusDto[])
    const [allBoards, setAllBoards] = useState([] as KanbanBoardDto[])
    const isDesktop = useMediaQuery("(min-width: 768px)")

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
    };

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        onSave({ ...formValues });
    };

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

    useEffect(() => {
        loadBoards().then(undefined)
    }, []);

    useEffect(() => {
        if (formValues.project?.id && formValues.project.id !== form?.project?.id){
            loadBoards().then(undefined)
        }
        setFormValues(form ? form : { name: '' })
    }, [form]);

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
                    disabled={true} // TODO: Search project here
                />
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-16">Board:</Label>
                <Input
                    className="flex-1 border-foreground hidden"
                    value={formValues.kanbanBoard?.boardName}
                    id="kanbanBoard"
                    disabled={isLoading || !formValues.project}
                />
                <Popover open={kanbanSearch} onOpenChange={setKanbanSearch}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={kanbanSearch}
                            className="flex-1 justify-between"
                            disabled={isLoading || !formValues.project}
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
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-16">Status:</Label>
                <Input
                    className="flex-1 border-foreground hidden"
                    value={formValues.taskStatus?.statusName}
                    id="taskStatus"
                    disabled={isLoading || !formValues.kanbanBoard}
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
                    disabled={isLoading}
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
        </div>
    }

    return <form onSubmit={handleSubmit}>
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
                    </div>
                    <div className={"w-80"}>
                        <MainGrid/>
                    </div>

                </div>
                <div className={'mt-4 w-full flex flex-row-reverse'}>
                    <Button disabled={isLoading} type={"submit"} className={'max-w-fit flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                        Create
                    </Button>
                </div>
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
                <Button disabled={isLoading} type={"submit"} className={'flex flex-grow w-full border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                    Create
                </Button>
            </>}
    </form>
}

export default CreateTaskForm