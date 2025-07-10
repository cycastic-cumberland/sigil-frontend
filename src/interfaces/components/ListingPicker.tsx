import {type FC, type ReactNode, type SyntheticEvent, useEffect, useMemo, useState} from "react";
import type {FolderItemDto, FolderItemType} from "@/dto/FolderItemDto.ts";
import {
    type ColumnDef, flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable
} from "@tanstack/react-table";
import {Link} from "react-router";
import type {TanstackRow, TanstackTable} from "@/dto/aliases.ts";
import api from "@/api.tsx";
import type {PageDto} from "@/dto/PageDto.ts";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, File, Folder, Hash, Text} from "lucide-react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import type {AttachmentPresignedDto} from "@/dto/AttachmentPresignedDto.ts";
import ConfirmationDialog from "@/interfaces/components/ConfirmationDialog.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {extractAndEncodePathFragments} from "@/utils/path.ts";
import {notifyApiError} from "@/utils/errors.ts";
import {toast} from "sonner";

const possiblePageSizes = [5, 10, 20]

export type ListingSelectAction = "dropdown" | "callback"

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

const AttachmentContextMenu: FC<{
    fullPath: string,
    isLoading: boolean,
    uploadCompleted?: boolean,
}> = ({ fullPath, isLoading, uploadCompleted }) => {
    const [isDownloading, setIsDownloading] = useState(false)

    const downloadFile = async () => {
        try {
            setIsDownloading(true)
            const response = await api.get(`listings/attachment/download?listingPath=${fullPath}`)
            const presigned = response.data as AttachmentPresignedDto
            const link = document.createElement('a')
            link.href = presigned.url
            link.target = '_blank'
            link.click();
            link.remove();
        } catch (e) {
            notifyApiError(e)
        } finally {
            setIsDownloading(false)
        }
    }

    return <>
        <DropdownMenuItem className={'cursor-pointer'} disabled={isDownloading || isLoading || !(uploadCompleted ?? false)} onClick={downloadFile}>
            Download
        </DropdownMenuItem>
    </>
}


const encodedListingPath = (path: string): string => {
    return path.split("/").filter(s => s).map(encodeURIComponent).join("/")
}

const LinkWrapper: FC<{
    to: string,
    enableLinks: boolean,
    className?: string,
    onClick?: (e: SyntheticEvent) => void,
    children: ReactNode | ReactNode[]
}> = ({ to, enableLinks, className, onClick, children }) => {
    return enableLinks ? <Link to={to} onClick={onClick} className={className}>{ children }</Link> : children
}

const ItemContextMenu: FC<{
    fullPath: string,
    item: FolderItemDto,
    isLoading: boolean,
}> = ({ fullPath, item, isLoading }): ReactNode => {
    return item.type === 'ATTACHMENT' ?
        <AttachmentContextMenu fullPath={fullPath} isLoading={isLoading} uploadCompleted={item.attachmentUploadCompleted}/> : <>
            <DropdownMenuItem className={'cursor-pointer'}>
                View/Update
            </DropdownMenuItem>
        </>
}

const ItemRow: FC<{
    row: TanstackRow<FolderItemDto>,
    currentDir: string,
    setCurrentDir: (d: string) => void,
    isLoading: boolean,
    setIsLoading: (b: boolean) => void,
    enableLinks: boolean,
    prefix: string,
    refreshTrigger: () => void,
    selectAction: ListingSelectAction,
    onListingSelected: (fullPath: string) => void,
}> = ({ row, currentDir, setCurrentDir, isLoading, setIsLoading, enableLinks, prefix, refreshTrigger, selectAction, onListingSelected }) => {
    const fullPath = useMemo(() => currentDir + row.original.name, [currentDir, row])
    const [confirmDeleteOpened, setConfirmDeleteOpened] = useState(false)

    const onDelete = async () => {
        try {
            setIsLoading(true)
            setConfirmDeleteOpened(false)

            await api.delete(`listings?listingPath=${fullPath}`)
            toast.success("Listing deleted")
        } catch (e) {
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }

        refreshTrigger()
    }

    const toListingUrl = (name: string) => {
        const currentDirEncoded = encodedListingPath(currentDir)
        const nameEncoded = encodedListingPath(name)
        return `${prefix}/${currentDirEncoded}/${nameEncoded}/`
    }

    const getFile = (name: string) => {
        const currentDirEncoded = encodedListingPath(currentDir)
        const nameEncoded = encodedListingPath(name)
        return `/${currentDirEncoded}/${nameEncoded}`
    }

    const getDir = (name: string) => {
        return getFile(name) + '/'
    }

    const onCellSelected = () => {
        if (row.original.type === 'FOLDER') {
            setCurrentDir(getDir(row.original.name))
            return
        }

        // Not a folder
        if (selectAction == "callback"){
            onListingSelected(getFile(row.original.name))
        }
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
            <DropdownMenuTrigger asChild disabled={selectAction !== "dropdown" || (isLoading || row.original.type === 'FOLDER')}>
                <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={'cursor-pointer'}
                >
                    {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className={cell.column.id === 'type' ? 'max-w-fit' : 'gap-2'} onClick={onCellSelected}>
                            { row.original.type === 'FOLDER' ? <>
                                    { cell.column.id === 'type' ?
                                        <LinkWrapper enableLinks={enableLinks} to={toListingUrl(row.original.name)} className={'flex flex-row gap-2 w-full'} >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </LinkWrapper>
                                        : <LinkWrapper enableLinks={enableLinks} to={toListingUrl(row.original.name)}
                                                className={'flex flex-row gap-2 w-full'} >
                                        <span className={'truncate'}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </span>
                                        </LinkWrapper> }
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
                                 isLoading={isLoading}/>
                <DropdownMenuItem className={'cursor-pointer text-destructive'} disabled={isLoading} onClick={() => setConfirmDeleteOpened(true)}>
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </>
}

const ListingPicker: FC<{
    isLoading: boolean,
    setIsLoading: (b: boolean) => void,
    currentDir: string,
    setCurrentDir: (encodedPath: string) => void,
    links?: boolean,
    linkPrefix?: string,
    selectAction?: ListingSelectAction,
    onListingSelected?: (fullPath: string) => void,
}> = ({ isLoading, setIsLoading, currentDir, setCurrentDir, links, linkPrefix, selectAction, onListingSelected }) => {
    const [items, setItems] = useState([] as FolderItemDto[])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [pageCount, setPageCount] = useState(0);
    const [sorting, setSorting] = useState<SortingState>([]);
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
        } catch (e) {
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    return <>
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
                                { encodedPathFragments.length <= 1 ? <></> : <TableRow className={"cursor-pointer"} onClick={() => setCurrentDir(encodedPathFragments[encodedPathFragments.length - 2].url)}>
                                    <TableCell className={'max-w-fit'}>
                                        <LinkWrapper enableLinks={links ?? false} to={`${linkPrefix ?? '/listings/browser'}${encodedPathFragments[encodedPathFragments.length - 2].url}`} className={'flex flex-row gap-2 w-full'} >
                                            { getIcon('FOLDER') }
                                        </LinkWrapper>
                                    </TableCell>
                                    <TableCell className={'flex flex-row gap-2'}>
                                        <LinkWrapper enableLinks={links ?? false} to={`${linkPrefix ?? '/listings/browser'}${encodedPathFragments[encodedPathFragments.length - 2].url}`} className={'flex flex-row gap-2 w-full'} >
                                            <span>..</span>
                                        </LinkWrapper>
                                    </TableCell>
                                    <TableCell className={'w-1/5'}>
                                        <LinkWrapper enableLinks={links ?? false} to={`${linkPrefix ?? '/listings/browser'}${encodedPathFragments[encodedPathFragments.length - 2].url}`} className={'flex flex-row gap-2 w-full'} >
                                            <span className={'invisible'}>a</span>
                                        </LinkWrapper>
                                    </TableCell>
                                </TableRow> }
                                { table.getRowModel().rows.map((row, i) => (
                                    <ItemRow key={i}
                                             row={row}
                                             currentDir={currentDir}
                                             setCurrentDir={setCurrentDir}
                                             isLoading={isLoading}
                                             setIsLoading={setIsLoading}
                                             enableLinks={links ?? false}
                                             prefix={linkPrefix ?? '/listings/browser'}
                                             refreshTrigger={refreshTrigger}
                                             selectAction={selectAction ?? "dropdown"}
                                             onListingSelected={onListingSelected ?? (() => {throw Error("Listing callback not specified")})}/>
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
                        <div className={"hidden md:flex flex-col justify-center text-center"}>
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

export default ListingPicker;