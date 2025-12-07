import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {useEffect, useMemo, useState} from "react";
import {getUserRole} from "@/utils/auth.ts";
import {Link, useNavigate} from "react-router";
import {toast} from "sonner";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {notifyApiError} from "@/utils/errors.ts";
import api from "@/api.ts";
import {formatQueryParameters} from "@/utils/format.ts";
import type {PageDto} from "@/dto/PageDto.ts";
import type {UserInfoDto} from "@/dto/user/UserInfoDto.ts";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem, PaginationLink, PaginationNext,
    PaginationPrevious
} from "@/components/ui/pagination.tsx";
import {cn} from "@/lib/utils.ts";
import {Button} from "@/components/ui/button.tsx";
import {PenLine, Plus} from "lucide-react";
import {type ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, useReactTable} from "@tanstack/react-table";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";

const MAX_PAGE_SIZE = 10

const columnDefs: ColumnDef<UserInfoDto>[] = [
    {
        accessorKey: 'id',
        header: 'ID'
    },
    {
        accessorKey: 'email',
        header: 'Email'
    },
    {
        accessorKey: 'firstName',
        header: 'First name'
    },
    {
        accessorKey: 'lastName',
        header: 'Last name'
    },
    {
        id: 'details',
        accessorFn: () => null,
        header: 'Edit',
    },
]

const AdminUsersPage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [users, setUsers] = useState([] as UserInfoDto[])
    const [query, setQuery] = useState('')
    const [page, setPage] = useState(1)
    const [totalPage, setTotalPage] = useState(null as number | null)
    const table = useReactTable({
        data: users,
        columns: columnDefs,
        pageCount: page,
        manualPagination: true,
        manualSorting: true,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })
    const relativePages = useMemo(() => {
        if (totalPage === null){
            return [page]
        }

        let rPages = [page]
        if (page > 1){
            rPages = [page - 1, ...rPages]
        }
        if (totalPage> page){
            rPages = [...rPages, page + 1]
        }
        return rPages
    }, [page, totalPage])
    const ellipsisLeft = useMemo(() => {
        if (totalPage === null){
            return true
        }

        return relativePages[0] > 1
    }, [totalPage, relativePages])
    const ellipsisRight = useMemo(() => {
        if (totalPage === null){
            return true
        }

        return totalPage > relativePages[relativePages.length - 1]
    }, [totalPage, relativePages])
    const [debouncedQuery, setDebouncedQuery] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        if (!(getUserRole() ?? []).includes('ADMIN')){
            toast.error("You don't have enough permission to access this page")
            navigate('/')
        }
    }, [navigate])

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query.trim())
            setPage(1)
        }, 300)

        return () => {
            clearTimeout(handler)
        }
    }, [query])

    useEffect(() => {
        (async () => {
            try {
                setIsLoading(true)
                const response = await api.get(formatQueryParameters('admin/users', {
                    contentTerm: debouncedQuery ? debouncedQuery : undefined,
                    pageSize: MAX_PAGE_SIZE,
                    page,
                }))

                const p = response.data as PageDto<UserInfoDto>
                setUsers(p.items)
                setTotalPage(p.totalPages)
            } catch (e){
                notifyApiError(e)
            } finally {
                setIsLoading(false)
            }
        })()
    }, [debouncedQuery, page])

    return <MainLayout>
        <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-foreground font-bold"}>
                    User list
                </Label>
            </div>
            <div className={'flex flex-row w-full gap-2'}>
                <Input placeholder={'Search by email prefix…'} value={query} onChange={c => setQuery(c.target.value)}/>
                <Button variant={"ghost"} className={'cursor-pointer'} asChild>
                    <Link to={'/admin/user/new'}>
                        <Plus/>
                        Create
                    </Link>
                </Button>
            </div>
            <div className={'w-full my-5'}>
                <div className={'rounded-md border'}>
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map(headerGroup => (<TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => (<TableHead key={header.id}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                </TableHead>))}
                            </TableRow>))}
                        </TableHeader>
                        <TableBody>
                            {isLoading && <TableRow>
                                <TableCell colSpan={columnDefs.length}
                                           className="h-24 text-foreground text-xl font-bold">
                                    <div className={"flex flex-row justify-center items-center content-center w-full"}>
                                        <Spinner/>
                                    </div>
                                </TableCell>
                            </TableRow>}
                            {!isLoading && <>
                                {table.getRowModel().rows?.length
                                    ? (table.getRowModel().rows.map(row => (
                                        <TableRow key={row.id}
                                                  data-state={row.getIsSelected() && "selected"}
                                                  className={"cursor-pointer"}>
                                            {row.getVisibleCells().map(cell => (
                                                <TableCell key={cell.id}>
                                                    {cell.column.id === 'details' ? <>
                                                        <Button className={'text-primary border-primary border-2 cursor-pointer hover:bg-primary hover:text-background'} asChild>
                                                            <Link to={'/admin/user/details/' + row.original.id}>
                                                                <PenLine/>
                                                                Edit
                                                            </Link>
                                                        </Button>
                                                    </> : flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    )))
                                    : <TableRow>
                                        <TableCell colSpan={columnDefs.length} className="h-24 text-center">
                                            No results.
                                        </TableCell>
                                    </TableRow>}
                            </>}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <Pagination>
                <PaginationContent>
                    {relativePages[0] < page && <PaginationItem>
                        <PaginationPrevious onClick={() => setPage(p => p - 1)} className={'cursor-pointer'}/>
                    </PaginationItem>}
                    {ellipsisLeft && <PaginationItem>
                        <PaginationEllipsis/>
                    </PaginationItem>}
                    {relativePages.map((p, i) => <PaginationItem key={i}>
                        <PaginationLink onClick={() => setPage(p)}
                                        className={cn('cursor-pointer', p === page && 'bg-primary')}>
                            {p}
                        </PaginationLink>
                    </PaginationItem>)}
                    {ellipsisRight && <PaginationItem>
                        <PaginationEllipsis/>
                    </PaginationItem>}
                    {totalPage && (relativePages[relativePages.length - 1] > page) && <PaginationItem>
                        <PaginationNext onClick={() => setPage(p => p + 1)} className={'cursor-pointer'}/>
                    </PaginationItem>}
                </PaginationContent>
            </Pagination>
        </div>
    </MainLayout>
}

export default AdminUsersPage