import {
    type FC,
    type ReactNode,
    type RefObject,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import type {FolderItemDto, FolderItemType} from "@/dto/FolderItemDto.ts";
import {
    type ColumnDef, flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable
} from "@tanstack/react-table";
import type {TanstackRow, TanstackTable} from "@/dto/aliases.ts";
import type {PageDto} from "@/dto/PageDto.ts";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Vault,
    ChevronDown,
    File,
    Folder,
    Hash,
    Text,
    Download,
    Trash
} from "lucide-react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import type {AttachmentPresignedDto} from "@/dto/AttachmentPresignedDto.ts";
import ConfirmationDialog from "@/interfaces/components/ConfirmationDialog.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {encodedListingPath, extractAndEncodePathFragments, splitByFirst} from "@/utils/path.ts";
import {extractError, notifyApiError} from "@/utils/errors.ts";
import {toast} from "sonner";
import type {PartitionDto} from "@/dto/PartitionDto.ts";
import {createApi} from "@/api.ts";
import axios, {type AxiosInstance} from "axios";
import {
    base64ToUint8Array,
    decryptWithPrivateKey,
    digestMd5,
    uint8ArrayToBase64
} from "@/utils/cryptography.ts";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {useServerCommunication} from "@/contexts/ServerCommunicationContext.tsx";
import {useTenant} from "@/contexts/TenantContext.tsx";
import LinkWrapper from "@/interfaces/components/LinkWrapper.tsx";
import PrivateKeyDecryptionDialog from "@/interfaces/components/PrivateKeyDecryptionDialog.tsx";
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu.tsx";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle
} from "@/components/ui/sheet.tsx";
import type {Callback} from "@/utils/misc.ts";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb.tsx";
import {Link} from "react-router";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle
} from "@/components/ui/drawer.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import type {AttachmentDto} from "@/dto/AttachmentDto.ts";
import {formatQueryParameters, humanizeFileSize} from "@/utils/format.ts";

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
        case "PARTITION":
            return <Vault/>
        default:
            throw Error("Unsupported type: " + type)
    }
}

const getFileNameFromPath = (path: string): string => {
    return path.substring(path.lastIndexOf('/') + 1);
}


const AttachmentContextMenu: FC<{
    isLoading: boolean,
    uploadCompleted?: boolean,
    downloadFile: () => void,
}> = ({ isLoading, uploadCompleted, downloadFile }) => {

    return <>
        <ContextMenuItem className={'cursor-pointer'}
                          disabled={isLoading || !(uploadCompleted ?? false)}
                          onClick={downloadFile}>
            Download
        </ContextMenuItem>
    </>
}

const AttachmentDetailsForm: FC<{
    api: AxiosInstance,
    listingPath: string,
}> = ({ api, listingPath }) => {
    const [isLoading, setIsLoading] = useState(false)
    const [attachment, setAttachment] = useState(null as AttachmentDto | null)

    useEffect(() => {
        (async () => {
           try {
               setIsLoading(true)

               const response = await api.get(formatQueryParameters("listings/attachment", {listingPath}))
               setAttachment(response.data as AttachmentDto)
           } catch (e){
               notifyApiError(e)
           } finally {
               setIsLoading(false)
           }
        })()
    }, [api, listingPath]);

    if (isLoading){
        return <FullSizeSpinner/>
    }

    if (!attachment){
        return <></>
    }

    return <>
        <div className="flex flex-row gap-2">
            <Label className="w-32">Size:</Label>
            <Input
                className="flex-1 border-foreground"
                value={humanizeFileSize(attachment.contentLength)}
                readOnly={true}
            />
        </div>
        <div className="flex flex-row gap-2">
            <Label className="w-32">Content type:</Label>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Input
                        className="flex-1 border-foreground"
                        value={attachment.mimeType}
                        readOnly={true}
                    />
                </TooltipTrigger>
                <TooltipContent>
                    {attachment.mimeType}
                </TooltipContent>
            </Tooltip>
        </div>
    </>
}

const ItemDetailsSheet: FC<{
    openSheet: boolean,
    setOpenSheet: Callback<boolean>,
    api: AxiosInstance,
    currentDir: string,
    item: FolderItemDto,
    downloadFn?: () => void,
    deleteFn?: () => void,
}> = ({ openSheet, setOpenSheet, api, currentDir, item, downloadFn, deleteFn }) => {
    const fullPath = useMemo(() => '/' + splitByFirst(currentDir, '/_/')[1] + item.name, [currentDir, item])
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const {tenantId} = useTenant()
    const slices = useMemo(() => extractAndEncodePathFragments(currentDir), [currentDir])

    const breadcrumb = <Breadcrumb>
        <BreadcrumbList>
            <>
                { slices.map((s, i) => <>
                    { i === 0 ? <></> : <div className={"flex items-center"}><BreadcrumbSeparator/></div> }
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to={`/tenant/${tenantId}/partitions/browser${s.url}`} className={"flex items-center"}>
                                { i === 0 ? "All partitions" : s.display.slice(0, s.display.length - 1) }
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                </>) }
            </>
        </BreadcrumbList>
    </Breadcrumb>

    const footer = <>
        {downloadFn && <Button variant={"outline"} className={"cursor-pointer"} onClick={downloadFn}>
            <Download/>
            Download
        </Button>}
        {deleteFn && <Button variant={"destructive"} className={"cursor-pointer"} onClick={deleteFn}>
            <Trash/>
            Delete
        </Button>}
    </>

    const details = openSheet && <form className={"px-6"}>
        <div className="grid gap-2">
            { item.type === "ATTACHMENT" && <AttachmentDetailsForm api={api} listingPath={fullPath}/> }
        </div>
    </form>

    return isDesktop ?
        <Sheet open={openSheet} onOpenChange={setOpenSheet}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle className={"text-xl"}>
                        {item.name}
                        <SheetDescription className={"mt-4"}>
                            {breadcrumb}
                        </SheetDescription>
                    </SheetTitle>
                </SheetHeader>
                {details}
                <SheetFooter>
                    {footer}
                </SheetFooter>
            </SheetContent>
        </Sheet>
        : <Drawer open={openSheet} onOpenChange={setOpenSheet}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle className={"text-xl"}>
                        {item.name}
                    </DrawerTitle>
                    <DrawerDescription>
                        {breadcrumb}
                    </DrawerDescription>
                </DrawerHeader>
                {details}
                <DrawerFooter className={"mb-2"}>
                    {footer}
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
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
    api: AxiosInstance,
    partitionRef: RefObject<PartitionDto | null>,
    getPartitionKey: () => Promise<Uint8Array>,
    onListingSelected: (fullPath: string) => void,
    requireDecrypt: () => void,
}> = ({ row, currentDir, setCurrentDir, isLoading, setIsLoading, enableLinks, prefix, refreshTrigger, selectAction, api, partitionRef, getPartitionKey, onListingSelected, requireDecrypt }) => {
    const [openSheet, setOpenSheet] = useState(false)
    const fullPath = useMemo(() => '/' + splitByFirst(currentDir, '/_/')[1] + row.original.name, [currentDir, row])
    const [confirmDeleteOpened, setConfirmDeleteOpened] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const {userPrivateKey} = useAuthorization()
    const toastIdRef = useRef('' as string | number)
    const {wrapSecret} = useServerCommunication()

    const downloadFileDirect = async () => {
        try {
            setIsDownloading(true)
            const partitionKey = await getPartitionKey()
            const partitionKeyMd5 = digestMd5(partitionKey)

            const partitionKeyBase64 = uint8ArrayToBase64(partitionKey)
            const partitionKeyMd5Base64 = uint8ArrayToBase64(partitionKeyMd5)
            const presignedResponse = await api.get(`listings/attachment/presigned?listingPath=${fullPath}&keyMd5=${encodeURIComponent(partitionKeyMd5Base64)}&presignType=DIRECT_ENCRYPTED`)
            const presigned = presignedResponse.data as AttachmentPresignedDto

            const controller = new AbortController();
            const s3Response = await axios.get(presigned.url, {
                responseType: 'blob',
                signal: controller.signal,
                headers: {
                    'x-amz-server-side-encryption-customer-algorithm': 'AES256',
                    'x-amz-server-side-encryption-customer-key-md5': partitionKeyMd5Base64,
                    'x-amz-server-side-encryption-customer-key': partitionKeyBase64,
                },
                onDownloadProgress: (progressEvent) => {
                    const total = progressEvent.total ?? 1;
                    let percentCompleted = Math.round((progressEvent.loaded * 100) / total);
                    percentCompleted = percentCompleted > 100 ? 10 : percentCompleted;
                    toast.loading(`Downloading... ${percentCompleted}%`, {
                        id: toastIdRef.current,
                        cancel: {
                            label: 'Abort',
                            onClick: () => controller.abort()
                        }
                    })
                }
            })
            const fileName = getFileNameFromPath(fullPath)
            const href = URL.createObjectURL(s3Response.data)
            const link = document.createElement('a');
            link.href = href
            link.download = fileName
            link.target = '_blank'
            link.click();
            link.remove();
            toast.success("File downloaded", { id: toastIdRef.current, cancel: undefined })
        } catch (e) {
            if (axios.isCancel(e)){
                toast.info("Download aborted")
                toast.info("Download aborted", { id: toastIdRef.current, cancel: undefined })
            } else {
                const err = extractError(e) ?? 'Error encountered while proccessing request'
                toast.error(err, { id: toastIdRef.current, cancel: undefined })
                throw e
            }
        } finally {
            setIsDownloading(false)
        }
    }

    const downloadServerSideKeyDerivation = async () => {
        try {
            setIsDownloading(true)
            const partitionKey = await getPartitionKey()
            const partitionKeyBase64 = uint8ArrayToBase64(partitionKey)

            const encryptedPartitionKey = await wrapSecret(Uint8Array.from(partitionKeyBase64.split("").map(x => x.charCodeAt(0))))

            const presignedResponse = await api.get(`listings/attachment/presigned?listingPath=${fullPath}&presignType=SERVER_SIDE_KEY_DERIVATION`, {
                headers: {
                    'x-encryption-key': encryptedPartitionKey
                }
            })
            const presigned = presignedResponse.data as AttachmentPresignedDto
            const link = document.createElement('a')
            link.href = presigned.url
            link.target = '_blank'
            link.click();
            link.remove();
        } catch (e: unknown){
            notifyApiError(e)
        } finally {
            setIsDownloading(false)
        }
    }

    const downloadFile = async () => {
        if (partitionRef.current!.serverSideKeyDerivation){
            await downloadServerSideKeyDerivation()
            return
        }

        toastIdRef.current = toast.loading("Starting download");
        await downloadFileDirect()
    }

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

    const toListingUrl = () => {
        const name = row.original.name
        const currentDirEncoded = encodedListingPath(currentDir)
        const nameEncoded = encodedListingPath(name)
        return `${prefix}/${currentDirEncoded}/${nameEncoded}/${row.original.type === "PARTITION" ? '_/' : ''}`
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

    const onDownload = () => userPrivateKey ? downloadFile() : requireDecrypt()

    return <>
        <ItemDetailsSheet openSheet={openSheet}
                          setOpenSheet={setOpenSheet}
                          api={api}
                          item={row.original}
                          currentDir={currentDir}
                          downloadFn={row.original.type === "ATTACHMENT" ? onDownload : undefined}
                          deleteFn={(!!partitionRef.current && partitionRef.current.permissions.includes("WRITE")) ? () => setConfirmDeleteOpened(true) : undefined}/>
        <ConfirmationDialog confirmationOpened={confirmDeleteOpened}
                            setConfirmationOpened={setConfirmDeleteOpened}
                            onAccepted={onDelete}
                            title={'Delete listing'}
                            message={'Are you sure you want to delete this listing? This action is irreversible!'}
                            acceptText={'Delete'}
                            destructive/>
        <ContextMenu>
            <ContextMenuTrigger disabled={selectAction !== "dropdown" || (isLoading || row.original.type === 'FOLDER' || row.original.type === 'PARTITION')}
                                asChild>
                <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={'cursor-pointer'}
                    onClick={row.original.type === "FOLDER" ? undefined : () => setOpenSheet(true)}
                >
                    {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className={cell.column.id === 'type' ? 'max-w-fit' : 'gap-2'} onClick={onCellSelected}>
                            { (row.original.type === 'FOLDER' || row.original.type === 'PARTITION') ? <>
                                    { cell.column.id === 'type' ?
                                        <LinkWrapper enableLinks={enableLinks} to={toListingUrl()} className={'flex flex-row gap-2 w-full'} >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </LinkWrapper>
                                        : <LinkWrapper enableLinks={enableLinks} to={toListingUrl()}
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
            </ContextMenuTrigger>
            <ContextMenuContent>
                { row.original.type === "ATTACHMENT" &&
                    <AttachmentContextMenu isLoading={isLoading || isDownloading}
                                           uploadCompleted={row.original.attachmentUploadCompleted}
                                           downloadFile={onDownload}/>}
                <ContextMenuItem className={"cursor-pointer"} onClick={() => setOpenSheet(true)}>
                    Details
                </ContextMenuItem>
                { (!!partitionRef.current && partitionRef.current.permissions.includes("WRITE")) &&
                    <ContextMenuItem variant={"destructive"}
                                     className={"cursor-pointer"}
                                     disabled={isLoading}
                                     onClick={() => setConfirmDeleteOpened(true)}>
                    Delete
                </ContextMenuItem> }
            </ContextMenuContent>
        </ContextMenu>
    </>
}

const ListingPicker: FC<{
    isLoading: boolean,
    setIsLoading: (b: boolean) => void,
    currentDir: string,
    setCurrentDir: (encodedPath: string) => void,
    partitionRef: RefObject<PartitionDto | null>,
    partitionKeyRef: RefObject<Uint8Array | null>,
    links?: boolean,
    linkPrefix?: string,
    selectAction?: ListingSelectAction,
    onListingSelected?: (fullPath: string) => void,
}> = ({ isLoading, setIsLoading, currentDir, setCurrentDir, partitionRef, partitionKeyRef, links, linkPrefix, selectAction, onListingSelected }) => {
    const [items, setItems] = useState([] as FolderItemDto[])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [pageCount, setPageCount] = useState(0);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [enableDecryption, setEnableDecryption] = useState(false)
    const {userPrivateKey} = useAuthorization()
    const {tenantId} = useTenant()
    const encodedPathFragments = useMemo(() => extractAndEncodePathFragments(currentDir), [currentDir])
    const partitionIdRef = useRef(null as number | null)
    const api = createApi(partitionIdRef)
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

    const getPartitionKey = async () => {
        if (partitionKeyRef.current){
            return partitionKeyRef.current
        }

        if (!partitionRef.current){
            throw Error("Partition is not set")
        }

        const userKey = userPrivateKey!
        const decryptedPartitionKey = await decryptWithPrivateKey(userKey, base64ToUint8Array(partitionRef.current.userPartitionKey.cipher))
        partitionKeyRef.current = decryptedPartitionKey
        return decryptedPartitionKey
    }

    const updateTableContent = async (pageIndex: number, pageSize: number, sortParams: string | null) => {
        try {
            setIsLoading(true)

            let url = ''
            if (currentDir.includes("/_/")){
                // eslint-disable-next-line prefer-const
                let [partitionUrl, listingUrl] = splitByFirst(currentDir, '/_/')
                listingUrl = '/' + listingUrl
                if (!partitionIdRef.current || partitionUrl !== (partitionRef?.current?.partitionPath ?? '')){
                    const resp = await api.get(`partitions/partition?partitionPath=${encodeURIComponent(partitionUrl)}`)
                    const partitionData = resp.data as PartitionDto
                    partitionRef.current = partitionData
                    partitionIdRef.current = partitionData.id
                    partitionKeyRef.current = null
                }

                url = `listings/subfolders?folder=${encodeURIComponent(listingUrl)}&page=${pageIndex + 1}&pageSize=${pageSize}`
            } else {
                url = `partitions?folder=${encodeURIComponent(currentDir)}&page=${pageIndex + 1}&pageSize=${pageSize}`
            }
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
        <PrivateKeyDecryptionDialog openDialog={enableDecryption}
                                    onComplete={() => { setEnableDecryption(false); toast.success("Decryption completed, please retry"); }}
                                    onReject={() => setEnableDecryption(false)}/>
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
                                        <LinkWrapper enableLinks={links ?? false} to={`${linkPrefix ?? `/tenant/${tenantId}/partitions/browser`}${encodedPathFragments[encodedPathFragments.length - 2].url}`} className={'flex flex-row gap-2 w-full'} >
                                            { getIcon('FOLDER') }
                                        </LinkWrapper>
                                    </TableCell>
                                    <TableCell className={'flex flex-row gap-2'}>
                                        <LinkWrapper enableLinks={links ?? false} to={`${linkPrefix ?? `/tenant/${tenantId}/partitions/browser`}${encodedPathFragments[encodedPathFragments.length - 2].url}`} className={'flex flex-row gap-2 w-full'} >
                                            <span>..</span>
                                        </LinkWrapper>
                                    </TableCell>
                                    <TableCell className={'w-1/5'}>
                                        <LinkWrapper enableLinks={links ?? false} to={`${linkPrefix ?? `/tenant/${tenantId}/partitions/browser`}${encodedPathFragments[encodedPathFragments.length - 2].url}`} className={'flex flex-row gap-2 w-full'} >
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
                                             prefix={linkPrefix ?? `/tenant/${tenantId}/partitions/browser`}
                                             refreshTrigger={refreshTrigger}
                                             selectAction={selectAction ?? "dropdown"}
                                             api={api}
                                             partitionRef={partitionRef}
                                             getPartitionKey={getPartitionKey}
                                             requireDecrypt={() => setEnableDecryption(true)}
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