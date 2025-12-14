import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {cn} from "@/lib/utils.ts";
import {Label} from "@/components/ui/label.tsx";
import api from "@/api.ts";
import {formatQueryParameters} from "@/utils/format.ts";
import type {EnumerablePageDto} from "@/dto/PageDto.ts";
import type {EntitlementDto} from "@/dto/EntitlementDto.ts";
import {useEffect, useState} from "react";
import {notifyApiError} from "@/utils/errors.ts";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import {Link} from "react-router";
import {useTenant} from "@/contexts/TenantContext.tsx";
import {Button} from "@/components/ui/button.tsx";
import {PenLine, Plus} from "lucide-react";
import {type ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, useReactTable} from "@tanstack/react-table";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {usePageTitle} from "@/hooks/use-page-title.ts";

const columnDefs: ColumnDef<EntitlementDto>[] = [
    {
        accessorKey: 'entitlementType',
        header: 'Entitlement Type'
    },
    {
        id: 'details',
        accessorFn: () => null,
        header: 'Edit',
    },
]

const getAllEntitlements = async () => {
    const response = await api.get(formatQueryParameters('admin/entitlements', {
        pageSize: 100
    }))

    return (response.data as EnumerablePageDto<EntitlementDto>).items
}

const AdminEntitlementsPage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [entitlements, setEntitlements] = useState([] as EntitlementDto[])
    const {tenantId} = useTenant()
    const table = useReactTable({
        data: entitlements,
        columns: columnDefs,
        pageCount: 1,
        manualPagination: true,
        manualSorting: true,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    const getEntitlements = async () => {
        try {
            setIsLoading(true)

            const entitlements = await getAllEntitlements()
            setEntitlements(entitlements)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    usePageTitle('Entitlements')

    useEffect(() => {
        getEntitlements().then(undefined)
    }, [])

    return <MainLayout>
        <div className={cn("w-full p-5 flex flex-col gap-2")}>
            <Label className={"my-2 text-2xl text-foreground font-bold"}>
                Entitlements
            </Label>
            <div>
                <Button className={'text-background bg-primary border-2 border-primary cursor-pointer hover:border-solid hover:text-primary hover:bg-background'} asChild>
                    <Link to={`/admin/entitlements/${tenantId}/new`}>
                        <Plus/>
                        Create
                    </Link>
                </Button>
            </div>
            {isLoading ? <div className={'w-full flex flex-col h-56 justify-center'}>
                <FullSizeSpinner/>
            </div> : <div className={'w-full my-5'}>
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
                                                            <Link to={`/admin/entitlements/${tenantId}/details/${encodeURIComponent(row.original.entitlementType)}`}>
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
            </div>}
        </div>
    </MainLayout>
}

export default AdminEntitlementsPage