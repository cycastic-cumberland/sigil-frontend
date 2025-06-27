import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import ProjectGuard from "@/interfaces/layouts/ProjectGuard.tsx";
import {Link, useLocation, useNavigate} from "react-router";
import {
    type FC,
    type ReactNode,
    useEffect, useMemo,
    useState
} from "react";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, File, Folder, Hash, Plus, Text} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import api from "@/api.tsx";
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable
} from "@tanstack/react-table";
import type {FolderItemDto, FolderItemType} from "@/dto/FolderItemDto.ts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import AttachmentUploadDialog from "@/interfaces/components/AttachmentUploadDialog.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import type {AttachmentPresignedDto} from "@/dto/AttachmentPresignedDto.ts";
import ConfirmationDialog from "@/interfaces/components/ConfirmationDialog.tsx";
import type {TanstackRow, TanstackTable} from "@/dto/aliases.ts";
import {useProject} from "@/contexts/ProjectContext.tsx";
import type {PageDto} from "@/dto/PageDto.ts";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";

const itemsColumnDef: ColumnDef<FolderItemDto>[] = [
    {
        accessorKey: 'type',
        header: 'Type',
        cell: info => {
            const v = info.getValue() as FolderItemType;
            return getIcon(v)
        }
    },
    {
        accessorKey: 'name',
        header: 'Name'
    },
    {
        accessorKey: 'modifiedAt',
        header: 'Modified at',
        enableSorting: true,
        sortDescFirst: false,
        cell: info => {
            const v = info.getValue();
            if (info.column.id === 'modifiedAt' && !v){
                return <span className={'invisible'}>a</span>
            }
            return v
        }
    },
]

const extractAndEncodePathFragments = (dir: string): { display: string, url: string }[] => {
    const split = dir.split('/').filter(s => s);
    switch (split.length){
        case 0:{
            return [{ display: '/', url: '/' }]
        }
        default: {
            const currSlices = [{ display: '/', url: '/' }]
            let lastFragment = '/'
            for (const fragment of split) {
                lastFragment = `${lastFragment}${encodeURIComponent(fragment)}/`
                currSlices.push({
                    display: `${fragment}/`,
                    url: lastFragment
                })
            }

            return currSlices;
        }
    }
}

const extractPath = (path: string): string => {
    let subPath = path.replace(/^\/listings\/browser\/?/, '');
    subPath = decodeURIComponent(subPath)
    subPath = subPath ? subPath : '/'
    subPath = subPath.endsWith('/') ? subPath : (subPath + '/')
    subPath = subPath.startsWith('/') ? subPath : ('/' + subPath)
    return subPath
}

const getIcon = (type: FolderItemType): ReactNode => {
    switch (type){
        case "TEXT":
            return <Text/>
        case "DECIMAL":
            return <Hash/>
        case "ATTACHMENT":
            return <File/>
        case "FOLDER":
            return <Folder/>
        default:
            throw Error("Unsupported type: " + type)
    }
}

const encodedListingPath = (path: string): string => {
    return path.split("/").filter(s => s).map(encodeURIComponent).join("/")
}

const AttachmentContextMenu: FC<{
    fullPath: string,
    isLoading: boolean,
    setIsLoading: (b: boolean) => void,
    uploadCompleted?: boolean,
}> = ({ fullPath, isLoading, setIsLoading, uploadCompleted }) => {
    const downloadFile = async () => {
        try {
            setIsLoading(true)
            const response = await api.get(`listings/attachment/download?listingPath=${fullPath}`)
            const presigned = response.data as AttachmentPresignedDto
            const link = document.createElement('a')
            link.href = presigned.url
            link.target = '_blank'
            link.click();
            link.remove();
        } finally {
            setIsLoading(false)
        }
    }

    return <>
        <DropdownMenuItem className={'cursor-pointer'} disabled={isLoading || !(uploadCompleted ?? false)} onClick={downloadFile}>
            Download
        </DropdownMenuItem>
    </>
}

const ItemContextMenu: FC<{
    fullPath: string,
    item: FolderItemDto,
    isLoading: boolean,
    setIsLoading: (b: boolean) => void,
}> = ({ fullPath, item, isLoading, setIsLoading }): ReactNode => {
    return item.type === 'ATTACHMENT' ?
        <AttachmentContextMenu fullPath={fullPath} isLoading={isLoading} setIsLoading={setIsLoading} uploadCompleted={item.attachmentUploadCompleted}/> : <>
        <DropdownMenuItem className={'cursor-pointer'}>
            View/Update
        </DropdownMenuItem>
    </>
}

const ItemRow: FC<{
    row: TanstackRow<FolderItemDto>,
    currentDir: string,
    isLoading: boolean,
    setIsLoading: (b: boolean) => void,
    refreshTrigger: () => void
}> = ({ row, currentDir, isLoading, setIsLoading, refreshTrigger }) => {
    const fullPath = useMemo(() => currentDir + row.original.name, [currentDir, row])
    const [confirmDeleteOpened, setConfirmDeleteOpened] = useState(false)
    const navigate = useNavigate()

    const onDelete = async () => {
        try {
            setIsLoading(true)
            setConfirmDeleteOpened(false)

            await api.delete(`listings?listingPath=${fullPath}`)
        }  finally {
            setIsLoading(false)
        }

        refreshTrigger()
    }

    const toListingUrl = (name: string) => {
        const currentDirEncoded = encodedListingPath(currentDir)
        const nameEncoded = encodedListingPath(name)
        return `/listings/browser/${currentDirEncoded}/${nameEncoded}/`
    }

    return <>
        <ConfirmationDialog confirmationOpened={confirmDeleteOpened}
                            setConfirmationOpened={setConfirmDeleteOpened}
                            onAccepted={onDelete}
                            title={'Delete listing'}
                            message={'Are you sure you want to delete this listing? This action is irreversible!'}
                            acceptText={'Delete'}
                            destructive/>
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isLoading || row.original.type === 'FOLDER'}>
                <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={'cursor-pointer'}
                >
                    {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className={cell.column.id === 'type' ? 'max-w-fit' : 'gap-2'} onClick={() => row.original.type === 'FOLDER' && navigate(toListingUrl(row.original.name))}>
                            { row.original.type === 'FOLDER' ? <>
                                    { cell.column.id === 'type' ?
                                        <Link to={toListingUrl(row.original.name)} className={'flex flex-row gap-2 w-full'} >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </Link>
                                        : <Link to={toListingUrl(row.original.name)}
                                                                                className={'flex flex-row gap-2 w-full'} >
                                        <span className={'truncate'}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </span>
                                    </Link> }
                                </>:
                                <>
                                    { cell.column.id === 'type'
                                        ? !(row.original.attachmentUploadCompleted ?? true) ? <>
                                            <Tooltip>
                                                <TooltipTrigger className={'text-destructive'}>
                                                    { flexRender(cell.column.columnDef.cell, cell.getContext()) }
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>This file is either not finished uploading or corrupted</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </> : flexRender(cell.column.columnDef.cell, cell.getContext())
                                        : <div className={'flex flex-row gap-2'}>
                                        <span className={cell.column.id === 'name' ? 'text-wrap' : ''}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </span>
                                    </div> }
                                </> }
                        </TableCell>
                    ))}
                </TableRow>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={'start'}>
                <ItemContextMenu fullPath={fullPath}
                                 item={row.original}
                                 isLoading={isLoading}
                                 setIsLoading={setIsLoading}/>
                <DropdownMenuItem className={'cursor-pointer text-destructive'} disabled={isLoading} onClick={() => setConfirmDeleteOpened(true)}>
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </>
}

const possiblePageSizes = [5, 10, 20]

const FileTable: FC<{ currentDir: string }> = ({ currentDir }) => {
    const [isLoading, setIsLoading] = useState(false)
    const [attachmentUploadOpened, setAttachmentUploadOpened] = useState(false)
    const [items, setItems] = useState([] as FolderItemDto[])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [pageCount, setPageCount] = useState(0);
    const [sorting, setSorting] = useState<SortingState>([]);
    const navigate = useNavigate()
    const encodedPathFragments = useMemo(() => extractAndEncodePathFragments(currentDir), [currentDir])
    const table: TanstackTable<FolderItemDto> = useReactTable({
        data: items,
        columns: itemsColumnDef,
        pageCount,
        state: { pagination, sorting },
        manualPagination: true,
        manualSorting: true,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
    })

    useEffect(() => {
        refreshTrigger().then(undefined)
    }, [pagination, sorting, currentDir]);

    const refreshTrigger = () => {
        const sortParams = sorting.length
            ? sorting
                .map(s => `${s.id}:${s.desc ? 'desc' : 'asc'}`)
                .join(',')
            : null;

        return updateTableContent(pagination.pageIndex, pagination.pageSize, sortParams)
    }

    const updateTableContent = async (pageIndex: number, pageSize: number, sortParams: string | null) => {
        try {
            setIsLoading(true)

            let url = `listings/subfolders?folder=${encodeURIComponent(currentDir)}&page=${pageIndex + 1}&pageSize=${pageSize}`
            if (sortParams !== null){
                url = `${url}&orderBy=${encodeURIComponent(sortParams)}`
            }
            const response = await api.get(url)
            const page = response.data as PageDto<FolderItemDto>
            setItems(page.items)
            setPageCount(page.totalPages)
        } finally {
            setIsLoading(false)
        }
    }

    return <>
        <AttachmentUploadDialog isOpened={attachmentUploadOpened}
                                setIsOpened={setAttachmentUploadOpened}
                                isLoading={isLoading}
                                setIsLoading={setIsLoading}
                                refreshTrigger={refreshTrigger}
                                currentDir={currentDir}/>
        <div className={"my-3"}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button className={"text-foreground border-dashed border-2 border-foreground cursor-pointer " +
                        "hover:border-solid hover:text-background hover:bg-foreground"}
                            onClick={() => {}} disabled={isLoading}>
                        { isLoading ? <Spinner/> : <Plus/> }
                        <span>Create...</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                    <DropdownMenuItem className={"cursor-pointer"} disabled={true}>
                        <Text/>
                        <span>
                            Text
                        </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className={"cursor-pointer"} disabled={true}>
                        <Hash/>
                        <span>
                            Decimal
                        </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className={"cursor-pointer"} onClick={() => setAttachmentUploadOpened(true)}>
                        <File/>
                        <span>
                            Attachment
                        </span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <div className={"my-3 w-full"}>
            <div className="rounded-md border border-foreground">
                <Table className={"text-foreground"}>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const canSort = header.column.getCanSort();
                                    const sortState = header.column.getIsSorted();
                                    return (
                                        <TableHead key={header.id}
                                                   onClick={(canSort && !isLoading) ? header.column.getToggleSortingHandler() : undefined}
                                                   className={`cursor-pointer text-foreground ${header.id === 'modifiedAt' ? 'min-w-1/4' : header.id === 'type' ? '' : 'w-full'}`}>
                                            {header.isPlaceholder
                                                ? null
                                                : <div className={"flex flex-row gap-1"}>
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    <div className={"flex flex-col justify-center"}>
                                                        {canSort && (sortState === 'asc' ? <ArrowUp size={15}/> : sortState === 'desc' ? <ArrowDown size={15}/> : <ArrowUpDown size={15}/>)}
                                                    </div>
                                                </div>}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        { isLoading ? <TableRow>
                            <TableCell colSpan={itemsColumnDef.length}
                                       className="h-24 text-foreground text-xl font-bold">
                                <div className={"flex flex-row justify-center items-center content-center w-full"}>
                                    <Spinner/>
                                </div>
                            </TableCell>
                        </TableRow> : table.getRowModel().rows?.length
                            ? <>
                                { encodedPathFragments.length <= 1 ? <></> : <TableRow className={"cursor-pointer"} onClick={() => navigate(`/listings/browser${encodedPathFragments[encodedPathFragments.length - 2].url}`)}>
                                    <TableCell className={'max-w-fit'}>
                                        <Link to={`/listings/browser${encodedPathFragments[encodedPathFragments.length - 2].url}`} className={'flex flex-row gap-2 w-full'} >
                                            { getIcon('FOLDER') }
                                        </Link>
                                    </TableCell>
                                    <TableCell className={'flex flex-row gap-2'}>
                                        <Link to={`/listings/browser${encodedPathFragments[encodedPathFragments.length - 2].url}`} className={'flex flex-row gap-2 w-full'} >
                                            <span>..</span>
                                        </Link>
                                    </TableCell>
                                    <TableCell className={'w-1/5'}>
                                        <Link to={`/listings/browser${encodedPathFragments[encodedPathFragments.length - 2].url}`} className={'flex flex-row gap-2 w-full'} >
                                            <span className={'invisible'}>a</span>
                                        </Link>
                                    </TableCell>
                                </TableRow> }
                                { table.getRowModel().rows.map((row) => (
                                    <ItemRow row={row}
                                             currentDir={currentDir}
                                             isLoading={isLoading}
                                             setIsLoading={setIsLoading}
                                             refreshTrigger={refreshTrigger}/>
                                )) }
                            </>
                            : (<TableRow>
                                <TableCell colSpan={itemsColumnDef.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                <div className="flex items-start md:items-center justify-between space-y-2 md:space-y-0 py-2">
                    <div className={"flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-2 ml-2"}>
                        <div className={"flex flex-col justify-center text-center"}>
                            <div className={"text-foreground"}>
                                Page {pagination.pageIndex + 1} of {pageCount == 0 ? 1 : pageCount}
                            </div>
                        </div>
                        <div className={"ml-0 md:ml-3"}>
                            <DropdownMenu>
                                <DropdownMenuTrigger disabled={isLoading} asChild>
                                    <Button className={"border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background"}>
                                        <span className={"hidden md:block"}>
                                            Page size:&nbsp;
                                        </span>
                                        { pagination.pageSize }
                                        <ChevronDown/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center">
                                    { possiblePageSizes.map((p, i) => <DropdownMenuItem key={i} className={"cursor-pointer"} onSelect={() => setPagination({ ...pagination, pageSize: p })}>
                                        { p }
                                    </DropdownMenuItem>) }
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <div className="space-x-2 mr-2">
                        <Button
                            className={'cursor-pointer hover:bg-foreground hover:text-background'}
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage() || isLoading}
                        >
                            Previous
                        </Button>
                        <Button
                            className={'cursor-pointer hover:bg-foreground hover:text-background'}
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage() || isLoading}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    </>
}

const CurrentDirectory: FC<{ currentDir: string }> = ({ currentDir }) => {
    const [slices, setSlices] = useState([] as { display: string, url: string }[])

    useEffect(() => {
        setSlices(extractAndEncodePathFragments(currentDir))
    }, [currentDir]);

    return <>
        { slices.map((s, i) => <>
            <span>
                <Button className={"cursor-pointer bg-muted hover:bg-foreground hover:text-background mr-1 mb-1"} asChild>
                    <Link key={i} to={`/listings/browser${s.url}`}>
                        { i === 0 ? s.display : s.display.slice(0, s.display.length - 1) }
                    </Link>
                </Button>
            </span>
            { i > 0 ? <span className={'mr-1'}>/</span> : <></> }
        </>) }
    </>
}

const ListingsBrowser = () => {
    const location = useLocation()
    const [currentDir, setCurrentDir] = useState('/')
    const {activeProject} = useProject()

    useEffect(() => {
        setCurrentDir(extractPath(location.pathname))
    }, [location]);

    return <MainLayout>
        <ProjectGuard>
            <div className={"w-full p-5 flex flex-col"}>
                <div className={"my-2"}>
                    <Label className={"text-2xl text-foreground font-bold"}>
                        Listing browser
                    </Label>
                    <p className={"text-foreground text-sm"}>
                        Current directory:&nbsp;
                        <CurrentDirectory currentDir={currentDir}/>
                    </p>
                </div>
                <FileTable key={`${activeProject?.id ?? 0}:${currentDir}`} currentDir={currentDir}/>
            </div>
        </ProjectGuard>
    </MainLayout>
}

export default ListingsBrowser