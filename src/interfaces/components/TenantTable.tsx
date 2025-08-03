import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable
} from "@tanstack/react-table";
import {type FC, useEffect, useMemo, useState} from "react";
import type {TenantDto} from "@/dto/TenantDto.ts";
import {getAuth} from "@/utils/auth.ts";
import {useTenant} from "@/contexts/TenantContext.tsx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ArrowLeft, ArrowRight, ChevronDown} from "lucide-react";
import {notifyApiError} from "@/utils/errors.ts";
import LinkWrapper from "@/interfaces/components/LinkWrapper.tsx";

const projectSelectorColumnDef: ColumnDef<TenantDto>[] = [
    {
        accessorKey: 'tenantName',
        header: 'Name'
    },
    {
        accessorFn: t => t.membership === "OWNER" ? "Owner" : t.membership === "MODERATOR" ? "Moderator" : "Member",
        header: 'Membership'
    },
    {
        accessorKey: 'createdAt',
        header: 'Created at'
    }
]

const possiblePageSizes = [5, 10, 20, 50, 100]

const TenantTable: FC<{
    isLoading: boolean,
    setIsLoading: (b: boolean) => void,
    onSelect: (p: TenantDto) => void,
    getRowLink?: (p: TenantDto) => string,
    isDialog?: boolean,
}> = ({ isLoading, setIsLoading, onSelect, getRowLink, isDialog }) => {
    const [data, setData] = useState([] as TenantDto[])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [pageCount, setPageCount] = useState(0);
    const [sorting, setSorting] = useState<SortingState>([]);
    const {queryTenants} = useTenant()
    const columns = useMemo(() => projectSelectorColumnDef, [])
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

            const page = await queryTenants(getAuth()!.userId, pageIndex + 1, pageSize, sortParams)
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

    return <div className={"w-full"}>
        <div className={`rounded-md border ${isDialog ? '' : 'border-foreground'}`}>
            <Table className={isDialog ? '': 'text-foreground'}>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead key={header.id} className={isDialog ? '': 'text-foreground'}>
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
                    {isLoading ? <TableRow>
                        <TableCell colSpan={columns.length}
                                   className="h-24 text-foreground text-xl font-bold">
                            <div className={"flex flex-row justify-center items-center content-center w-full"}>
                                <Spinner/>
                            </div>
                        </TableCell>
                    </TableRow> : table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                                className={"cursor-pointer"}
                                onClick={() => onSelect(row.original)}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        <LinkWrapper to={getRowLink ? getRowLink(row.original) : '#'}
                                                     enableLinks={(!!getRowLink)}
                                                     onClick={() => onSelect(row.original)}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </LinkWrapper>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <div className="flex items-start md:items-center justify-between space-y-2 md:space-y-0 py-2">
                <div className={"flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-2 ml-2"}>
                    {!isDialog && <div className={"flex flex-col justify-center text-center"}>
                        <div className={"text-foreground"}>
                            Page {pagination.pageIndex + 1} of {pageCount == 0 ? 1 : pageCount}
                        </div>
                    </div>}
                    <div className={isDialog ? '' : 'ml-0 md:ml-3'}>
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
                        { isDialog ? <ArrowLeft/> : "Previous" }
                    </Button>
                    <Button
                        className={'cursor-pointer hover:bg-foreground hover:text-background'}
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage() || isLoading}
                    >
                        { isDialog ? <ArrowRight/> : "Next" }
                    </Button>
                </div>
            </div>
        </div>
    </div>
}

export default TenantTable;