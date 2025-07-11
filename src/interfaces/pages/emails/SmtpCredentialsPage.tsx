import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Plus} from "lucide-react";
import {
    type ColumnDef, flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable
} from "@tanstack/react-table";
import type {BaseSmtpCredentialDto, DecryptedSmtpCredentialDto} from "@/dto/SmtpCredentialDto.ts";
import {type FC, useEffect, useMemo, useState} from "react";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import type {PageDto} from "@/dto/PageDto.ts";
import api from "@/api.tsx";
import {Table, TableHeader, TableRow, TableHead, TableBody, TableCell} from "@/components/ui/table.tsx";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import ProjectGuard from "@/interfaces/layouts/ProjectGuard.tsx";
import type {AxiosError} from "axios";
import {Link, useNavigate} from "react-router";
import SmtpCredentialEditForm from "@/interfaces/components/SmtpCredentialEditForm.tsx";
import {useTenant} from "@/contexts/TenantContext.tsx";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from "@/components/ui/drawer.tsx";
import {notifyApiError} from "@/utils/errors.ts";
import {toast} from "sonner";

const credentialSelectorColumnDef: ColumnDef<BaseSmtpCredentialDto>[] = [
    {
        accessorKey: 'serverAddress',
        header: 'Server'
    },
    {
        accessorKey: 'secureSmtp',
        header: 'Security'
    },
    {
        accessorKey: 'fromName',
        header: 'Sender name'
    },
]


const possiblePageSizes = [5, 10, 20, 50, 100]

const CreateSmtpCredentialDialog: FC<{
    isLoading: boolean,
    setIsLoading: (l: boolean) => void,
    opened: boolean,
    setOpened: (o: boolean) => void,
    refreshTrigger: () => void,
}> = ({ isLoading, setIsLoading, opened, setOpened, refreshTrigger }) => {
    const [error, setError] = useState('')
    const isDesktop = useMediaQuery("(min-width: 768px)")

    const onSave = async (credential: DecryptedSmtpCredentialDto) => {
        try {
            setIsLoading(true)
            setError('')

            await api.post('emails/credential', credential)
            refreshTrigger()
            setOpened(false)
            toast.success("SMTP Credential created")
        } catch (e){
            // @ts-ignore
            setError((e as AxiosError).response?.data?.message ?? "")
        } finally {
            setIsLoading(false)
        }
    }

    return isDesktop ? <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Create new SMTP credential</DialogTitle>
                <DialogDescription>
                    Create a new SMTP credential to use mail queue functionality.
                </DialogDescription>
            </DialogHeader>
            <div className={"w-full"}>
                <SmtpCredentialEditForm isLoading={isLoading} onSave={onSave} error={error}/>
            </div>
        </DialogContent>
    </Dialog> : <Drawer open={opened} onOpenChange={setOpened}>
        <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>Create new SMTP credential</DrawerTitle>
                <DrawerDescription>
                    Create a new SMTP credential to use mail queue functionality.
                </DrawerDescription>
            </DrawerHeader>
            <div className={"w-full px-3 pb-3"}>
                <SmtpCredentialEditForm isLoading={isLoading} onSave={onSave} error={error}/>
            </div>
        </DrawerContent>
    </Drawer>
}

const CredentialTableImpl: FC<{
    setCreateCredOpened: (b: boolean) => void,
    isLoading: boolean,
    setIsLoading: (b: boolean) => void,
}> = ({ setCreateCredOpened, isLoading, setIsLoading }) => {
    const [data, setData] = useState([] as BaseSmtpCredentialDto[])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [pageCount, setPageCount] = useState(0);
    const [sorting, setSorting] = useState<SortingState>([]);
    const columns = useMemo(() => credentialSelectorColumnDef, [])
    const navigate = useNavigate()

    const table = useReactTable({
        data,
        columns,
        pageCount,
        state: { pagination, sorting },
        manualPagination: true,
        manualSorting: true,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
    })

    const updateTableContent = async (pageIndex: number, pageSize: number, sortParams: string | null) => {
        try {
            setIsLoading(true)

            let url = `emails/credentials?page=${pageIndex + 1}&pageSize=${pageSize}`
            if (sortParams !== null){
                url = `${url}&orderBy=${encodeURIComponent(sortParams)}`
            }

            const response = await api.get(url)
            const page = response.data as PageDto<BaseSmtpCredentialDto>
            setData(page.items)
            setPageCount(page.totalPages)
        } catch (e) {
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        const sortParams = sorting.length
            ? sorting
                .map(s => `${s.id}:${s.desc ? 'desc' : 'asc'}`)
                .join(',')
            : null;

        updateTableContent(pagination.pageIndex, pagination.pageSize, sortParams).then(undefined)
    }, [pagination, sorting]);

    return <div className={"my-3 w-full"}>
        <div className="rounded-md border border-foreground">
            <Table className={"text-foreground"}>
                <TableHeader>
                    {table.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map(header => {
                                const canSort = header.column.getCanSort();
                                const sortState = header.column.getIsSorted();
                                return (
                                    <TableHead
                                        key={header.id}
                                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                                        className={canSort ? 'cursor-pointer select-none text-foreground' : 'text-foreground'}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : <div className={"flex flex-row gap-1"}>
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                <div className={"flex flex-col justify-center"}>
                                                    {canSort && (sortState === 'asc' ? <ArrowUp size={15}/> : sortState === 'desc' ? <ArrowDown size={15}/> : <ArrowUpDown size={15}/>)}
                                                </div>
                                            </div>}
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {isLoading ? <TableRow>
                        <TableCell colSpan={columns.length}
                                   className="h-24 text-foreground text-xl font-bold">
                            <div className={"flex flex-row justify-center items-center content-center w-full"}>
                                <Spinner/>
                            </div>
                        </TableCell>
                    </TableRow> : table.getRowModel().rows.length ? (
                        table.getRowModel().rows.map(row => (
                            <TableRow key={row.id} className={'cursor-pointer'} onClick={() => navigate(`/emails/credential/${row.original.id}`)}>
                                {row.getVisibleCells().map(cell => (
                                    <TableCell key={cell.id}>
                                        <Link to={`/emails/credential/${row.original.id}`}>
                                            <div className={"w-full h-full"}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </div>
                                        </Link>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length}
                                       className="h-24 text-center drop-zone cursor-pointer text-foreground text-xl font-bold"
                                       onClick={() => setCreateCredOpened(true)}>
                                No credential found. Press here to create one.
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
}

const CredentialTable = () => {
    const [createCredOpened, setCreateCredOpened] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [counter, setCounter] = useState(0)

    const refreshTrigger = () => setCounter(c => c + 1);

    return <>
        <CreateSmtpCredentialDialog isLoading={isLoading}
                                    setIsLoading={setIsLoading}
                                    opened={createCredOpened}
                                    setOpened={setCreateCredOpened}
                                    refreshTrigger={refreshTrigger}/>
        <div className={"my-3"}>
            <Button className={"text-foreground border-dashed border-2 border-foreground cursor-pointer " +
                    "hover:border-solid hover:text-background hover:bg-foreground hover:bg-foreground"}
                    onClick={() => setCreateCredOpened(true)} disabled={isLoading}>
                { isLoading ? <Spinner/> : <Plus/> }
                <span>Create credential</span>
            </Button>
        </div>
        <CredentialTableImpl key={counter}
                             setCreateCredOpened={setCreateCredOpened}
                             isLoading={isLoading}
                             setIsLoading={setIsLoading}/>
    </>
}

const SmtpCredentialsPage = () => {
    const {activeProject} = useTenant()

    return <MainLayout>
        <ProjectGuard>
            <div className={"w-full p-5 flex flex-col"}>
                <div className={"my-2"}>
                    <Label className={"text-2xl text-foreground font-bold"}>
                        SMTP credentials
                    </Label>
                    <p className={"text-muted-foreground text-sm"}>
                        We will use these credentials to send templated emails.
                    </p>
                </div>
                <CredentialTable key={`${activeProject?.id ?? 0}`}/>
            </div>
        </ProjectGuard>
    </MainLayout>
}

export default SmtpCredentialsPage;