import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {useEffect, useMemo, useState} from "react";
import {getUserRole} from "@/utils/auth.ts";
import {Link, useNavigate} from "react-router";
import {toast} from "sonner";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
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

const MAX_PAGE_SIZE = 10

const AdminUsersPage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [users, setUsers] = useState([] as UserInfoDto[])
    const [query, setQuery] = useState('')
    const [page, setPage] = useState(1)
    const [totalPage, setTotalPage] = useState(null as number | null)
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
                        Create
                    </Link>
                </Button>
            </div>
            {isLoading ? <div className={'w-full flex flex-col h-56 justify-center'}>
                <FullSizeSpinner/>
            </div> : <div className={'w-full my-5'}>
                <table className={''}>
                    <thead>
                        <tr><td></td><td></td></tr>
                    </thead>
                    <tbody className={''}>
                        {users.map((u, i) => <tr key={i} className={'w-full'}>
                            <td className={'w-full'}>{u.email}</td>
                            <td className={'min-w-36'}>
                                <Link to={'/admin/user/details/' + u.id}>Details</Link>
                            </td>
                        </tr> )}
                    </tbody>
                </table>
            </div>}
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