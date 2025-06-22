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
import {Link} from "react-router";
import SmtpCredentialEditForm from "@/interfaces/components/SmtpCredentialEditForm.tsx";
import {useProject} from "@/contexts/ProjectContext.tsx";

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

const CreateSmtpCredentialDialog: FC<{ isLoading: boolean, setIsLoading: (l: boolean) => void, opened: boolean, setOpened: (o: boolean) => void }> = ({ isLoading, setIsLoading, opened, setOpened }) => {
    const [error, setError] = useState('')

    const onSave = async (credential: DecryptedSmtpCredentialDto) => {
        try {
            setIsLoading(true)
            setError('')

            await api.post('emails/credential', credential)
            window.location.reload()
        } catch (e){
            // @ts-ignore
            setError((e as AxiosError).response?.data?.message ?? "")
        } finally {
            setIsLoading(false)
        }
    }

    return <Dialog open={opened} onOpenChange={setOpened}>
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
    </Dialog>
}

const CredentialTable = () => {
    const [isLoading, setIsLoading] = useState(true)
    const [data, setData] = useState([] as BaseSmtpCredentialDto[])
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [pageCount, setPageCount] = useState(0);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [createCredOpened, setCreateCredOpened] = useState(false)
    const columns = useMemo(() => credentialSelectorColumnDef, [])

    const table = useReactTable({
        data,
        columns: columns,
        pageCount,
        state: {
            pagination: { pageIndex, pageSize },
            sorting,
        },
        manualPagination: true,
        manualSorting: true,
        getCoreRowModel: getCoreRowModel(),
        // getPaginationRowModel is only for client; we use pageCount above
        getSortedRowModel: getSortedRowModel(),
        // @ts-ignore
        onPaginationChange: ({ pageIndex, pageSize }) => {
            setPageIndex(pageIndex);
            setPageSize(pageSize);
        },
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

        updateTableContent(pageIndex, pageSize, sortParams).then(() => {})
    }, [pageIndex, pageSize, sorting]);

    return <>
        <CreateSmtpCredentialDialog isLoading={isLoading} setIsLoading={setIsLoading} opened={createCredOpened} setOpened={setCreateCredOpened}/>
        <div className={"my-3"}>
            <Button className={"text-secondary border-dashed border-2 border-secondary cursor-pointer " +
                    "hover:border-solid hover:text-primary hover:bg-secondary"}
                    onClick={() => setCreateCredOpened(true)}>
                <Plus/>
                <span>Create credential</span>
            </Button>
        </div>
        <div className={"my-3 w-full"}>
            <div className="rounded-md border border-secondary">
                <Table className={"text-secondary"}>
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
                                            className={canSort ? 'cursor-pointer select-none text-secondary' : 'text-secondary'}
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
                                       className="h-24 text-secondary text-xl font-bold">
                                <div className={"flex flex-row justify-center items-center content-center w-full"}>
                                    <Spinner/>
                                </div>
                            </TableCell>
                        </TableRow> : table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map(row => (
                                <TableRow key={row.id}>
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
                                           className="h-24 text-center drop-zone cursor-pointer text-secondary text-xl font-bold"
                                           onClick={() => setCreateCredOpened(true)}>
                                    No credential found. Press here to create one.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                <div className="flex items-center justify-between space-x-2 py-2">
                    <div className={"flex flex-row ml-2"}>
                        <div className={"flex flex-col justify-center"}>
                            <div className={"text-secondary"}>
                                Page {pageIndex + 1} of {pageCount == 0 ? 1 : pageCount}
                            </div>
                        </div>
                        <div className={"ml-3"}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className={"border-secondary border-2 cursor-pointer hover:bg-secondary hover:text-primary"}>
                                        Page size: { pageSize }
                                        <ChevronDown/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    { possiblePageSizes.map((p, i) => <DropdownMenuItem key={i} className={"cursor-pointer"} onSelect={() => setPageSize(p)}>
                                        { p }
                                    </DropdownMenuItem>) }
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <div className="space-x-2 mr-2">
                        <Button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage() || isLoading}
                        >
                            Previous
                        </Button>
                        <Button
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

const SmtpCredentialsPage = () => {
    const {activeProject} = useProject()

    return <MainLayout>
        <ProjectGuard>
            <div className={"w-full p-5 flex flex-col"}>
                <div className={"my-2"}>
                    <Label className={"text-2xl text-secondary font-bold"}>
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