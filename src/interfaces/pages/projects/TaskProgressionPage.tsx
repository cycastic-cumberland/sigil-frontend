import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    getBezierPath,
    useInternalNode,
    type Edge,
    Background,
    Controls,
    Position,
    MiniMap, ReactFlowProvider, type Connection, type NodeChange, type EdgeChange, MarkerType, type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ElkNode, {type ElkNodeType} from "@/interfaces/components/ElkNode.tsx";
import useLayoutNodes from "@/hooks/use-layout-nodes.ts";
import {
    type ChangeEvent,
    type FC,
    type RefObject,
    type SyntheticEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import {useTheme} from "@/contexts/ThemeContext.tsx";
import {Button} from "@/components/ui/button.tsx";
import {notifyApiError} from "@/utils/errors.ts";
import {formatQueryParameters} from "@/utils/format.ts";
import {isProjectPartition, type PartitionDto, type ProjectPartitionDto} from "@/dto/tenant/PartitionDto.ts";
import {Link, useLocation, useNavigate, useSearchParams} from "react-router";
import type {BlockingFC} from "@/utils/misc.ts";
import {
    AllTaskUniqueStereotypes,
    humanizeTaskUniqueStereotype,
    type TaskStatusDto,
    type TaskStatusesDto,
    type TaskUniqueStereotype
} from "@/dto/pm/TaskStatusDto.ts";
import {useTenant} from "@/contexts/TenantContext.tsx";
import {toast} from "sonner";
import {encodedListingPath} from "@/utils/path.ts";
import {createApi} from "@/api.ts";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import type {AxiosInstance} from "axios";
import {ArrowLeft, Asterisk, Check, Plus, Save} from "lucide-react";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from "@/components/ui/drawer.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {usePageTitle} from "@/hooks/use-page-title.ts";
import {useConsent} from "@/contexts/ConsentContext.tsx";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {Command, CommandEmpty, CommandGroup, CommandItem, CommandList} from "@/components/ui/command.tsx";
import {
    DropdownMenu, DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {cn} from "@/lib/utils.ts";
// @ts-ignore
import type {EdgeProps, InternalNode, Node} from "@xyflow/react/dist/esm/types";

type ConnectPayload = {
    fromId: number,
    toId: number
}

function getNodeIntersection<NodeType extends Node = Node>(intersectionNode: InternalNode<NodeType>, targetNode: InternalNode<NodeType>) {
    // https://math.stackexchange.com/questions/1724792/an-algorithm-for-finding-the-intersection-point-between-a-center-of-vision-and-a
    const { width: intersectionNodeWidth, height: intersectionNodeHeight } =
        intersectionNode.measured;
    const intersectionNodePosition = intersectionNode.internals.positionAbsolute;
    const targetPosition = targetNode.internals.positionAbsolute;

    const w = intersectionNodeWidth / 2;
    const h = intersectionNodeHeight / 2;

    const x2 = intersectionNodePosition.x + w;
    const y2 = intersectionNodePosition.y + h;
    const x1 = targetPosition.x + targetNode.measured.width / 2;
    const y1 = targetPosition.y + targetNode.measured.height / 2;

    const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
    const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
    const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
    const xx3 = a * xx1;
    const yy3 = a * yy1;
    const x = w * (xx3 + yy3) + x2;
    const y = h * (-xx3 + yy3) + y2;

    return { x, y };
}

// returns the position (top,right,bottom or right) passed node compared to the intersection point
function getEdgePosition<NodeType extends Node = Node>(node: InternalNode<NodeType>, intersectionPoint: { x: number, y: number }) {
    const n = { ...node.internals.positionAbsolute, ...node };
    const nx = Math.round(n.x);
    const ny = Math.round(n.y);
    const px = Math.round(intersectionPoint.x);
    const py = Math.round(intersectionPoint.y);

    if (px <= nx + 1) {
        return Position.Left;
    }
    if (px >= nx + n.measured.width - 1) {
        return Position.Right;
    }
    if (py <= ny + 1) {
        return Position.Top;
    }
    if (py >= n.y + n.measured.height - 1) {
        return Position.Bottom;
    }

    return Position.Top;
}

// returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) you need to create an edge
function getEdgeParams<NodeType extends Node = Node>(source: InternalNode<NodeType>, target: InternalNode<NodeType>) {
    const sourceIntersectionPoint = getNodeIntersection(source, target);
    const targetIntersectionPoint = getNodeIntersection(target, source);

    const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
    const targetPos = getEdgePosition(target, targetIntersectionPoint);

    return {
        sx: sourceIntersectionPoint.x,
        sy: sourceIntersectionPoint.y,
        tx: targetIntersectionPoint.x,
        ty: targetIntersectionPoint.y,
        sourcePos,
        targetPos,
    };
}

const extractPath = (path: string): string => {
    let subPath = path.replace(/^\/tenant\/[^/]+\/project\/progression\/?/, '');
    subPath = decodeURIComponent(subPath)
    subPath = subPath ? subPath : '/'
    subPath = subPath.endsWith('/') ? subPath.slice(0, -1) : subPath
    subPath = subPath.startsWith('/') ? subPath : ('/' + subPath)
    return subPath
}

const toNode = (status: TaskStatusDto, onClick?: (id: number) => void): ElkNodeType => {
    return {
        position: {
            x: 0,
            y: 0
        },
        id: status.id.toString(),
        data: {
            label: status.statusName,
            sourceHandles: [{
                id: `hs-[${status.id}]`
            }],
            targetHandles: [{
                id: `ht-[${status.id}]`
            }],
            onClick: onClick && (() => {
                onClick(status.id)
            })
        },
        type: 'elk'
    }
}

const toNodes = (statuses: TaskStatusDto[], onClick?: (id: number) => void): ElkNodeType[] => {

    return statuses.map(s => toNode(s, onClick))
}

const toEdges = (statuses: TaskStatusDto[]): Edge[] => {
    const edges = [] as Edge[]

    for (const tuple of statuses.map(s => s.nextTaskStatuses)
                    .filter(m => m)
                    .flatMap(m => m!)){
        const {fromStatusId, toStatusId, name} = tuple
        edges.push({
            id: `${fromStatusId}-${toStatusId}`,
            source: fromStatusId.toString(),
            target: toStatusId.toString(),
            label: name,
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
            },
        })
    }

    return edges
}

const globalApi = createApi(null)

const nodeTypes = {
    elk: ElkNode,
}

function FloatingEdge({ id, source, target, markerEnd, style }: EdgeProps & {
    data: unknown;
    type: unknown;
}) {
    const sourceNode = useInternalNode(source)
    const targetNode = useInternalNode(target)

    if (!sourceNode || !targetNode) {
        return null;
    }

    const {sx, sy, tx, ty, sourcePos, targetPos} = getEdgeParams(
        sourceNode,
        targetNode,
    )

    const [edgePath] = getBezierPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sourcePos,
        targetPosition: targetPos,
        targetX: tx,
        targetY: ty,
    })

    return (
        <path
            id={id}
            className="react-flow__edge-path"
            d={edgePath}
            markerEnd={markerEnd}
            style={style}
        />
    )
}

function OnConnectorNewStatusDialog<T>({ initialName, title, payload, onSave, isLoading }: {
    initialName?: string,
    title?: string
    payload: T,
    onSave: (p: T & { name: string }) => unknown,
    isLoading: boolean
}) {
    const [formValues, setFormValues] = useState({
        ...payload,
        name: initialName ?? ''
    })

    useEffect(() => {
        if (initialName){
            setFormValues(f => ({
                ...f,
                name: initialName
            }))
        }
    }, [initialName]);

    useEffect(() => {
        setFormValues({
            ...payload,
            name: ''
        })
    }, [payload]);

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        onSave({...formValues})
    }

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

    return <form onSubmit={handleSubmit}>
        <div className="grid gap-2">
            <div className="flex flex-row gap-2">
                <Label className="w-32">{title ?? 'Transition'} name:</Label>
                <Input
                    className="flex-1 border-foreground"
                    value={formValues.name}
                    onChange={handleChange}
                    id={"name"}
                    required
                />
            </div>
            <Button type={"submit"}
                    disabled={isLoading}
                    className={'flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                Create
            </Button>
        </div>
    </form>
}

const edgeTypes: EdgeTypes = { floating: FloatingEdge, }

const TaskProgressionControl: FC<BlockingFC & {
    nodes: ElkNodeType[],
    edges: Edge[],
    onRefresh: () => void,
    api: AxiosInstance,
    openStatusDetails: (id: number) => unknown,
    saveTrigger: RefObject<() => unknown>,
    unsavedRef: RefObject<boolean>,
    onStatusClickedRef: RefObject<(id: number) => void>,
    boardId: number,
}> = ({ onRefresh, openStatusDetails, isLoading, setIsLoading, saveTrigger, unsavedRef, onStatusClickedRef, boardId, api, nodes: initialNodes, edges: initialEdges }) => {
    const [connectPayload, setConnectPayload] = useState(null as null | ConnectPayload)
    const [isUnsaved, setIsUnsaved] = useState(false)
    const [counter, setCounter] = useState(0)
    const [nodes, setNodes, onNodesChange] = useNodesState([] as ElkNodeType[])
    const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[])
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const {theme} = useTheme()
    const {requireAgreement} = useConsent()
    const showConnectDialog = useMemo(() => !!connectPayload, [connectPayload])
    const confirmationRef: RefObject<Promise<boolean> | null> = useRef(null)

    const onSave = async () => {
        try {
            setIsLoading(true)
            const connections = edges.map(edge => {
                const [fromId, toId] = edge.id.split('-').map(p => p)
                if (!fromId || !toId){
                    console.error("Unreachable: fromId and toId", fromId, toId)
                    throw Error("Unreachable")
                }

                return{
                    fromStatusId: Number(fromId),
                    toStatusId: Number(toId),
                    statusName: edge.label
                }
            })

            await api.post('pm/tasks/statuses/connections', {
                kanbanBoardId: boardId,
                connections
            })

            onRefresh()
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        setNodes(initialNodes)
    }, [initialNodes])

    useEffect(() => {
        setEdges(initialEdges)
    }, [initialEdges])

    useEffect(() => {
        setIsUnsaved(edges !== initialEdges)
    }, [edges]);

    useEffect(() => {
        unsavedRef.current = isUnsaved
    }, [isUnsaved]);

    useEffect(() => {
        saveTrigger.current = onSave
    }, [onSave])

    useEffect(() => {
        onStatusClickedRef.current = openStatusDetails
    }, [])

    const onConnect = (params: Connection) => {
        if (params.source === params.target){
            return
        }

        const newEdge = {
            id: params.source + '-' + params.target,
            source: params.source,
            target: params.target,
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
            }
        }

        setConnectPayload({
            fromId: Number(params.source),
            toId: Number(params.target),
        })
        setEdges(edgesSnapshot => [
            newEdge,
            ...edgesSnapshot
        ])
        setCounter(c => c + 1)
    }

    const deleteNodes = async (nodeIds: string[]) => {
        try {
            setIsLoading(true)

            await api.delete(formatQueryParameters('pm/tasks/statuses', {
                statusIds: nodeIds.join(",")
            }))

            onRefresh()
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const onNodeChanges = async (changes: NodeChange<ElkNodeType>[]) => {
        try {
            const deletedNodes = changes.filter(c => c.type === 'remove')
            if (deletedNodes.length){
                if (!await requireAgreement({
                    title: "Delete statuses",
                    message: "Are you sure you want to delete these statuses? This action refresh the page and any unsaved changes might be discard",
                    acceptText: "Delete",
                    destructive: true,
                    ref: confirmationRef,
                })){
                    return
                }

                await deleteNodes(deletedNodes.map(n => n.id))
                return
            }
            onNodesChange(changes)
        } catch (e){
            notifyApiError(e)
        }
    }

    const onEdgeChanges = (changes: EdgeChange<Edge>[]) => {
        onEdgesChange(changes)
    }

    const setShowConnectDialog = (b: boolean) => {
        if (!connectPayload){
            return
        }
        if (b){
            return
        }

        const {fromId, toId} = connectPayload
        setEdges(edges => edges.filter(e => e.id !== fromId + '-' + toId))
        setConnectPayload(null)
        setCounter(c => c + 1)
    }

    const onSaveConnection = async (payload: ConnectPayload & { name: string }) => {
        const {fromId, toId, name} = payload
        setEdges(edges => {
            const [matchedEdge] = edges.filter(e => e.id === fromId + '-' + toId)
            if (!matchedEdge){
                toast.error("Could not connect status")
                return edges
            }

            return [
                {
                    ...matchedEdge,
                    label: name
                },
                ...edges.filter(e => e.id !== fromId + '-' + toId)
            ]
        })
        setConnectPayload(null)
        setCounter(c => c + 1)
    }

    useLayoutNodes(counter)

    return (
        <div className={'w-full h-full'}>
            {connectPayload && (isDesktop ? <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
                <DialogContent className="sm:max-w-2/5">
                    <DialogHeader>
                        <DialogTitle>Transition name</DialogTitle>
                        <DialogDescription>Set a name for this task status transition (e.g. "On Development", "On Ready")</DialogDescription>
                    </DialogHeader>
                    <div className={"w-full"}>
                        <OnConnectorNewStatusDialog payload={connectPayload} onSave={onSaveConnection} isLoading={isLoading}/>
                    </div>
                </DialogContent>
            </Dialog> : <Drawer open={showConnectDialog} onOpenChange={setShowConnectDialog}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Transition name</DrawerTitle>
                        <DrawerDescription>Set a name for this task status transition (e.g. "On Development", "On Ready")</DrawerDescription>
                    </DrawerHeader>
                    <div className={'w-full px-3 pb-3'}>
                        <OnConnectorNewStatusDialog payload={connectPayload} onSave={onSaveConnection} isLoading={isLoading}/>
                    </div>
                </DrawerContent>
            </Drawer>)}
            <ReactFlow
                nodes={nodes}
                onNodesChange={onNodeChanges}
                edges={edges}
                onConnect={onConnect}
                onEdgesChange={onEdgeChanges}
                nodeTypes={nodeTypes}
                panOnScroll={true}
                selectionOnDrag={true}
                panOnDrag={false}
                colorMode={theme === 'dark' ? 'dark' : 'light'}
                edgeTypes={edgeTypes}
                fitView
            >
                <Background />
                <Controls />
                <MiniMap/>
            </ReactFlow>
        </div>
    );
}

const onStatusClickedDummy = (_: number) => {

}

const TaskProgressionPanelStub: FC<BlockingFC & {
    project: ProjectPartitionDto,
    statuses: TaskStatusDto[],
    boardId: number,
    api: AxiosInstance,
    onRefresh: () => void,
    openStatusDetails: (id: number) => unknown,
    saveTrigger: RefObject<() => unknown>,
    unsavedRef: RefObject<boolean>,
}> = ({ isLoading, setIsLoading, api, statuses, boardId, onRefresh, openStatusDetails, saveTrigger, unsavedRef }) => {
    const onStatusClickedRef = useRef(onStatusClickedDummy)
    const mappedStatuses = useMemo(() => toNodes(statuses, id => onStatusClickedRef.current(id)), [statuses])
    const mappedEdges = useMemo(() => toEdges(statuses), [statuses])

    return <>
        <ReactFlowProvider>
            <TaskProgressionControl isLoading={isLoading}
                                    setIsLoading={setIsLoading}
                                    api={api}
                                    boardId={boardId}
                                    nodes={mappedStatuses}
                                    edges={mappedEdges}
                                    onRefresh={onRefresh}
                                    openStatusDetails={openStatusDetails}
                                    saveTrigger={saveTrigger}
                                    unsavedRef={unsavedRef}
                                    onStatusClickedRef={onStatusClickedRef}/>
        </ReactFlowProvider>
    </>
}

const CreateTaskStatusDialog: FC<BlockingFC & {
    api: AxiosInstance,
    boardId: number,
    open: boolean,
    setOpen: (b: boolean) => unknown
    onRefresh: () => void,
}> = ({api, open, boardId, setOpen, onRefresh, isLoading, setIsLoading}) => {
    const isDesktop = useMediaQuery("(min-width: 768px)")

    const onSave = async ({name}: {name: string}) => {
        try {
            setIsLoading(true)

            await api.post('pm/tasks/statuses', {
                kanbanBoardId: boardId,
                statusName: name,
            })

            setOpen(false)
            onRefresh()
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    return <>
        {isDesktop ? <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-2/5">
                    <DialogHeader>
                        <DialogTitle>Status name</DialogTitle>
                        <DialogDescription>Set a name for this task status (e.g. "In Development", "In Code Review")</DialogDescription>
                    </DialogHeader>
                    <div className={"w-full"}>
                        <OnConnectorNewStatusDialog title={'Status'} payload={{}} onSave={onSave} isLoading={isLoading}/>
                    </div>
                </DialogContent>
            </Dialog> : <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Status name</DrawerTitle>
                    <DrawerDescription>Set a name for this task status (e.g. "In Development", "In Code Review")</DrawerDescription>
                </DrawerHeader>
                <div className={'w-full px-3 pb-3'}>
                    <OnConnectorNewStatusDialog title={'Status'} payload={{}} onSave={onSave} isLoading={isLoading}/>
                </div>
            </DrawerContent>
        </Drawer>}
    </>
}

const StatusDetails: FC<{
    isLoading: boolean,
    taskStatus: TaskStatusDto,
    onSave: (t: TaskStatusDto) => unknown,
}> = ({isLoading, taskStatus, onSave}) => {
    const [formValues, setFormValues] = useState({...taskStatus})

    useEffect(() => {
        setFormValues({...taskStatus})
    }, [taskStatus])

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

    const setStereotype = (stereotype: TaskUniqueStereotype | null) => {
        setFormValues(f => ({
            ...f,
            stereotype: stereotype ? stereotype : undefined
        }))
    }

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        onSave({ ...formValues });
    }

    return <form onSubmit={handleSubmit}>
        <div className="grid gap-2">
            <Input
                className={"hidden"}
                value={formValues.id}
                type={"number"}
                id={"id"}
                disabled={isLoading}
                readOnly
            />
            <div className="flex flex-row gap-2">
                <Label className="w-32">Status name:</Label>
                <Input
                    className="flex-1 border-foreground"
                    value={formValues.statusName}
                    onChange={handleChange}
                    id="statusName"
                    required
                    disabled={isLoading}
                />
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-32">Stereotype:</Label>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button disabled={isLoading}
                                type={"submit"}
                                className={'flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                            {formValues.stereotype ? <>{humanizeTaskUniqueStereotype(formValues.stereotype)}</> : <>None</>}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className={"w-56"} align={"center"}>
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => setStereotype(null)}>
                                None
                            </DropdownMenuItem>
                            {AllTaskUniqueStereotypes.map((stereotype, i) => (<DropdownMenuItem key={i} onClick={() => setStereotype(stereotype)}>
                                {humanizeTaskUniqueStereotype(stereotype)}
                            </DropdownMenuItem>))}
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <Button disabled={isLoading}
                    type={"submit"}
                    className={'flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                Save
            </Button>
        </div>
    </form>
}

const SidePanel: FC<BlockingFC & {
    allStatuses: TaskStatusDto[],
    api: AxiosInstance,
    boardId: number,
    open: boolean,
    setOpen: (b: boolean) => unknown,
    openStatusDetailsRef: RefObject<(id: number | null) => unknown>,
    onRefresh: () => void,
}> = ({isLoading, setIsLoading, boardId, api, allStatuses, open, setOpen, openStatusDetailsRef, onRefresh}) => {
    const [openSelector, setOpenSelector] = useState(false)
    const [statusId, setStatusId] = useState(null as number | null)
    const [status, setStatus] = useState(null as TaskStatusDto | null)
    const isDesktop = useMediaQuery("(min-width: 768px)")

    useEffect(() => {
        openStatusDetailsRef.current = setStatusId
    }, [openStatusDetailsRef]);

    useEffect(() => {
        setOpenSelector(false)
    }, [open]);

    useEffect(() => {
        setOpenSelector(false)
        if (!statusId){
            setStatus(null)
            return
        }
        const [status] = allStatuses.filter(s => s.id === statusId)
        if (!status){
            toast.error("Status not found, please refresh the page to get newest data")
            return
        }

        setStatus(status)
    }, [allStatuses, statusId]);

    const onSaveStatus = async (status: TaskStatusDto) => {
        try {
            setIsLoading(true)

            await api.post('pm/tasks/statuses', {
                id: status.id,
                kanbanBoardId: boardId,
                statusName: status.statusName,
                stereotype: status.stereotype
            })

            onRefresh()
            setOpen(false)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const Selector = () => {
        return <>
            <Popover open={openSelector} onOpenChange={setOpenSelector}>
                <PopoverTrigger asChild>
                    <Button variant={"outline"} className={"w-full cursor-pointer"} disabled={isLoading}>
                        {status ? <>{status.statusName}</> : <>Select status</>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className={"p-0"} side={"bottom"} align={"center"}>
                    <Command>
                        {/*<CommandInput placeholder="Change status..." />*/}
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup>
                                {allStatuses.map((status) => (
                                    <CommandItem
                                        key={status.id}
                                        value={`${status.id}`}
                                        className={'cursor-pointer'}
                                        onSelect={value => {
                                            setStatusId(Number.parseInt(value))
                                        }}
                                    >
                                        {status.statusName}
                                        <Check
                                            className={cn(
                                                "ml-auto",
                                                status.id === statusId ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </>
    }

    return isDesktop ? <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
            <SheetHeader>
                <SheetTitle className={"text-xl"}>
                    {status ? status.statusName : 'Status selector'}
                    <SheetDescription className={"mt-4"}>
                        {status ? status.statusName + "'s details" : 'Select a status to begin'}
                    </SheetDescription>
                </SheetTitle>
            </SheetHeader>
            <div className={'px-3 flex flex-col gap-2'}>
                <Selector/>
                {status && <StatusDetails isLoading={isLoading} taskStatus={status} onSave={onSaveStatus}/>}
            </div>
        </SheetContent>
    </Sheet> : <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>{status ? status.statusName : 'Status selector'}</DrawerTitle>
                <DrawerDescription>
                    {status ? status.statusName + "'s details" : 'Select a status to begin'}
                </DrawerDescription>
            </DrawerHeader>
            <div className={'w-full px-3 pb-3 flex flex-col gap-2'}>
                <Selector/>
                {status && <StatusDetails isLoading={isLoading} taskStatus={status} onSave={onSaveStatus}/>}
            </div>
        </DrawerContent>
    </Drawer>
}

const TaskProgressionPage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [boardId, setBoardId] = useState(0)
    const [project, setProject] = useState(null as ProjectPartitionDto | null)
    const [searchParams] = useSearchParams()
    const [counter, setCounter] = useState(0)
    const [createStatus, setCreateStatus] = useState(false)
    const [openSidePanel, setOpenSidePanel] = useState(false)
    const location = useLocation()
    const [statuses, setStatuses] = useState([] as TaskStatusDto[])
    const {tenantId} = useTenant()
    const {requireAgreement} = useConsent()
    const partitionIdRef = useRef(null as number | null)
    const saveTrigger = useRef((() => null as unknown))
    const openStatusDetailsRef = useRef((id: number | null) => { return id as unknown })
    const unsavedRef = useRef(false)
    const confirmationRef: RefObject<Promise<boolean> | null> = useRef(null)
    const api = useMemo(() => createApi(partitionIdRef), [])
    const navigate = useNavigate()

    usePageTitle('Edit board progression')

    const getProject = async (partitionPath: string): Promise<ProjectPartitionDto> => {
        try {
            setIsLoading(true)

            const response = await globalApi.get(formatQueryParameters('partitions/partition', {
                partitionPath
            }))

            const partition = response.data as PartitionDto
            if (!isProjectPartition(partition)){
                navigate(`/tenant/${tenantId}/partitions/browser/`)
                throw Error('This partition is not a project partition')
            }
            return partition
        } finally {
            setIsLoading(false)
        }
    }

    const getStatuses = async (boardId: string): Promise<TaskStatusDto[]> => {
        try {
            setIsLoading(true)
            const response = await api.get(formatQueryParameters('pm/tasks/statuses', {
                kanbanBoardId: boardId
            }))

            return (response.data as TaskStatusesDto).taskStatuses
        } finally {
            setIsLoading(false)
        }
    }

    const loadStatuses = useCallback(async () => {
        const partitionPath = extractPath(location.pathname)
        const boardId = searchParams.get('board')
        try {
            const partition = await getProject(partitionPath)
            setProject(partition)
            if (!boardId || Number.isNaN(boardId)){
                toast.error('No board specified')
                navigate(`/tenant/${tenantId}/project/overview/${encodedListingPath(partitionPath)}`)
                return
            }
            partitionIdRef.current = partition.id
            const statuses = await getStatuses(boardId)
            setStatuses(statuses)
            setBoardId(Number(boardId))
        } catch (e){
            notifyApiError(e)
        }
    }, [location, searchParams])

    const onCreateStatus = async () => {
        try {
            setIsLoading(true)

            if (unsavedRef.current){
                if (!await requireAgreement({
                    title: "There are unsaved changes",
                    message: "Are you sure you want to create a new status? This action refresh the page and any unsaved changes might be discard",
                    acceptText: "Confirm",
                    ref: confirmationRef,
                })){
                    return
                }
            }

            setCreateStatus(true)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const onOpenSidePanel = (b: boolean) => {
        if (b){
            setOpenSidePanel(true)
        } else {
            openStatusDetailsRef.current(null)
            setOpenSidePanel(false)
        }
    }

    const openStatusDetails = (id: number) => {
        onOpenSidePanel(true)
        return openStatusDetailsRef.current(id)
    }

    useEffect(() => {
        loadStatuses().then(undefined)
    }, [loadStatuses, counter]);

    return <MainLayout>
        {isLoading && <div className={'w-full flex flex-col flex-grow'}>
            <FullSizeSpinner/>
        </div>}
        {(! isLoading && project && statuses) && <TaskProgressionPanelStub isLoading={isLoading}
                                                                           setIsLoading={setIsLoading}
                                                                           project={project}
                                                                           statuses={statuses}
                                                                           boardId={boardId}
                                                                           api={api}
                                                                           onRefresh={() => setCounter(c => c + 1)}
                                                                           openStatusDetails={openStatusDetails}
                                                                           saveTrigger={saveTrigger}
                                                                           unsavedRef={unsavedRef}/>}
        <CreateTaskStatusDialog api={api}
                                boardId={boardId}
                                open={createStatus}
                                setOpen={setCreateStatus}
                                isLoading={isLoading}
                                setIsLoading={setIsLoading}
                                onRefresh={() => setCounter(c => c + 1)}/>
        <SidePanel allStatuses={statuses}
                   api={api}
                   boardId={boardId}
                   open={openSidePanel}
                   setOpen={onOpenSidePanel}
                   openStatusDetailsRef={openStatusDetailsRef}
                   isLoading={isLoading}
                   setIsLoading={setIsLoading}
                   onRefresh={() => setCounter(c => c + 1)}/>
        <div className={'w-full flex flex-row justify-between py-2 px-2'}>
            <Button variant={'ghost'} className={'cursor-pointer'} asChild>
                <Link to={formatQueryParameters(`/tenant/${tenantId}/project/overview/${encodedListingPath(extractPath(location.pathname))}`, {
                    board: searchParams.get('board')
                })}>
                    <ArrowLeft/>
                    Back to project
                </Link>
            </Button>
            <div className={'flex gap-2'}>
                <Button className={'cursor-pointer bg-background text-foreground hover:bg-foreground hover:text-background'}
                        disabled={isLoading}
                        onClick={() => setOpenSidePanel(true)}>
                    <Asterisk/>
                </Button>
                <Button className={'cursor-pointer bg-background text-foreground hover:bg-foreground hover:text-background'}
                        disabled={isLoading}
                        onClick={onCreateStatus}>
                    <Plus/>
                    Add status
                </Button>
                <Button className={'cursor-pointer bg-foreground text-background border-foreground border-1 hover:bg-background hover:text-foreground'}
                        onClick={() => saveTrigger.current()}
                        disabled={isLoading}>
                    <Save/>
                    Save changes
                </Button>
            </div>
        </div>
    </MainLayout>
}

export default TaskProgressionPage