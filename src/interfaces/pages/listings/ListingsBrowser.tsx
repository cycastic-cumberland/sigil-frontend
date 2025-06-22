import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import ProjectGuard from "@/interfaces/layouts/ProjectGuard.tsx";
import {Link, useLocation} from "react-router";
import {
    type FC,
    type ReactNode,
    useEffect, useMemo,
    useState
} from "react";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {File, Folder, Hash, Plus, Text} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import api from "@/api.tsx";
import {type ColumnDef, flexRender, getCoreRowModel, useReactTable} from "@tanstack/react-table";
import type {FolderItemDto, FolderItemsDto, FolderItemType} from "@/dto/FolderItemDto.ts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import AttachmentUploadDialog from "@/interfaces/components/AttachmentUploadDialog.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import type {AttachmentPresignedDto} from "@/dto/AttachmentPresignedDto.ts";
import ConfirmationDialog from "@/interfaces/components/ConfirmationDialog.tsx";
import type {TanstackRow} from "@/dto/aliases.ts";
import {useProject} from "@/contexts/ProjectContext.tsx";

const itemsColumnDef: ColumnDef<FolderItemDto>[] = [
    {
        accessorKey: 'name',
        header: 'Name'
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
}> = ({ fullPath, isLoading, setIsLoading }) => {
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
        <DropdownMenuItem className={'cursor-pointer'} disabled={isLoading} onClick={downloadFile}>
            Download
        </DropdownMenuItem>
    </>
}

const ItemContextMenu: FC<{
    fullPath: string,
    type: FolderItemType,
    isLoading: boolean,
    setIsLoading: (b: boolean) => void,
}> = ({ fullPath, type, isLoading, setIsLoading }): ReactNode => {
    return type === 'ATTACHMENT' ? <AttachmentContextMenu fullPath={fullPath} isLoading={isLoading} setIsLoading={setIsLoading}/> : <>
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
                    className={"cursor-pointer"}
                >
                    {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className={"flex flex-row gap-2"}>
                            { row.original.type === 'FOLDER' ?
                                <Link to={toListingUrl(row.original.name)}
                                      className={'flex flex-row gap-2 w-full'} >
                                    <div className={'min-w-fit'}>
                                        { getIcon(row.original.type) }
                                    </div>
                                    <span className={'truncate'}>
                                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                </span>
                                </Link> :
                                <div className={'flex flex-row gap-2'}>
                                    <div className={'min-w-fit'}>
                                        { getIcon(row.original.type) }
                                    </div>
                                    <span className={'text-wrap'}>
                                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                            </span>
                                </div> }
                        </TableCell>
                    ))}
                </TableRow>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={'start'}>
                <ItemContextMenu fullPath={fullPath}
                                 type={row.original.type}
                                 isLoading={isLoading}
                                 setIsLoading={setIsLoading}/>
                <DropdownMenuItem className={'cursor-pointer text-destructive'} disabled={isLoading} onClick={() => setConfirmDeleteOpened(true)}>
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </>
}

const FileTable: FC<{ currentDir: string }> = ({ currentDir }) => {
    const [isLoading, setIsLoading] = useState(false)
    const [attachmentUploadOpened, setAttachmentUploadOpened] = useState(false)
    const [items, setItems] = useState([] as FolderItemDto[])
    const table = useReactTable({
        data: items,
        columns: itemsColumnDef,
        getCoreRowModel: getCoreRowModel(),
    })
    const encodedPathFragments = useMemo(() => extractAndEncodePathFragments(currentDir), [currentDir])

    useEffect(() => {
        refreshTrigger().then(() => {})
    }, [currentDir]);

    const refreshTrigger = async () => {
        try {
            setIsLoading(true)
            const response = await api.get(`listings/subfolders?folder=${encodeURIComponent(currentDir)}`)
            setItems((response.data as FolderItemsDto).items)
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
                    <Button className={"text-secondary border-dashed border-2 border-secondary cursor-pointer " +
                        "hover:border-solid hover:text-primary hover:bg-secondary"}
                            onClick={() => {}}>
                        <Plus/>
                        <span>Create...</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
            <div className="rounded-md border border-secondary">
                <Table className={"text-secondary"}>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className={"text-secondary"}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        { isLoading ? <TableRow>
                            <TableCell colSpan={itemsColumnDef.length}
                                       className="h-24 text-secondary text-xl font-bold">
                                <div className={"flex flex-row justify-center items-center content-center w-full"}>
                                    <Spinner/>
                                </div>
                            </TableCell>
                        </TableRow> : table.getRowModel().rows?.length
                            ? <>
                                { encodedPathFragments.length <= 1 ? <></> : <TableRow className={"cursor-pointer"}>
                                    <TableCell className={'flex flex-row gap-2'}>
                                        <Link to={`/listings/browser${encodedPathFragments[encodedPathFragments.length - 2].url}`} className={'flex flex-row gap-2 w-full'} >
                                            { getIcon('FOLDER') }
                                            <span>..</span>
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
                <Button className={"cursor-pointer hover:bg-secondary hover:text-primary mr-1 mb-1"} asChild>
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
                    <Label className={"text-2xl text-secondary font-bold"}>
                        Listing browser
                    </Label>
                    <p className={"text-secondary text-sm"}>
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