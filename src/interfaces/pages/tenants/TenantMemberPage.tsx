import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Link} from "react-router";
import {ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, ChevronsUpDown, Folder, Plus} from "lucide-react";
import {useTenant} from "@/contexts/TenantContext.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {type FC, type SyntheticEvent, useEffect, useState} from "react";
import type {BlockingFC} from "@/utils/misc.ts";
import type {TenantDto} from "@/dto/tenant/TenantDto.ts";
import type {TenantUserDto} from "@/dto/tenant/TenantUserDto.ts";
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable
} from "@tanstack/react-table";
import type {TanstackTable} from "@/dto/aliases.ts";
import type {PageDto} from "@/dto/PageDto.ts";
import {notifyApiError} from "@/utils/errors.ts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {
    ALL_TENANT_PERMISSIONS,
    getHumanReadableTenantPermission,
    joinTenantPermissions,
    type TenantPermission
} from "@/dto/Permissions.ts";
import api from "@/api.ts";
import {formatQueryParameters} from "@/utils/format.ts";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from "@/components/ui/drawer.tsx";
import {Input} from "@/components/ui/input.tsx";
import {toast} from "sonner";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {Command, CommandGroup, CommandItem} from "@/components/ui/command.tsx";
import {cn} from "@/lib/utils.ts";
import {usePageTitle} from "@/hooks/use-page-title.ts";

const itemsColumnDef: ColumnDef<TenantUserDto>[] = [
    {
        accessorKey: 'email',
        header: "Email"
    },
    {
        accessorKey: 'firstName',
        header: "First name"
    },
    {
        accessorKey: 'lastName',
        header: "Last name"
    },
    {
        accessorKey: 'permissions',
        accessorFn: p => p.membership === "OWNER" ? "Owner" : joinTenantPermissions(p.permissions),
        header: "Permissions"
    },
]

const possiblePageSizes = [5, 10, 50, 100]

const TenantMemberTable: FC<BlockingFC & {
    tenant: TenantDto,
}> = ({ isLoading, setIsLoading, tenant }) => {
    const [items, setItems] = useState([] as TenantUserDto[])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [pageCount, setPageCount] = useState(0);
    const [sorting, setSorting] = useState<SortingState>([]);
    const table: TanstackTable<TenantUserDto> = useReactTable({
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

    const updateTableContent = async (pageIndex: number, pageSize: number, sortParams: string | null) => {
        try {
            setIsLoading(true)

            const params: Record<string, string | number> = {
                page: pageIndex + 1,
                pageSize,
            }
            if (sortParams !== null){
                params.orderBy = sortParams
            }

            const url = formatQueryParameters("tenants/members", params)
            const response = await api.get(url)
            const page = response.data as PageDto<TenantUserDto>
            setItems(page.items)
            setPageCount(page.totalPages)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const refreshTrigger = async () => {
        const sortParams = sorting.length
            ? sorting
                .map(s => `${s.id}:${s.desc ? 'desc' : 'asc'}`)
                .join(',')
            : null;

        await updateTableContent(pagination.pageIndex, pagination.pageSize, sortParams)
    }

    useEffect(() => {
        refreshTrigger().then(null)
    }, [pagination, sorting, tenant]);

    return <div className={"my-3 w-full"}>
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
                                               className={'text-foreground cursor-pointer'}>
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
                    {isLoading ? <TableRow>
                        <TableCell colSpan={itemsColumnDef.length}
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
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
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
                    <div className={'ml-0 md:ml-3'}>
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

const InviteUserDialog: FC<BlockingFC> = ({ isLoading, setIsLoading }) => {
    const [email, setEmail] = useState('')
    const [permissionArray, setPermissionArray] = useState(["MEMBER"] as TenantPermission[])
    const [permissionsPopoverOpened, setPermissionsPopoverOpened] = useState(false)

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault()

        try {
            setIsLoading(true)

            let permissions = 0
            for (const perm of permissionArray) {
                switch (perm) {
                    case "CREATE_PARTITIONS":
                        permissions |= 1
                        break;
                    case "DELETE_PARTITIONS":
                        permissions |= 2
                        break;
                    case "MODERATE":
                        permissions |= 4
                        break;
                    case "LIST_USERS":
                        permissions |= 8
                        break;

                }
            }

            const params = {
                email,
                permissions
            }

            const url = formatQueryParameters("tenants/members/invite", params)
            await api.post(url)

            toast.success("User invited")
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    };

    const togglePermissions = (tenantPermission: TenantPermission) => {
        setPermissionArray(perms => perms.includes(tenantPermission)
            ? perms.filter((p) => p !== tenantPermission)
            : [...perms, tenantPermission])
    }

    return <form onSubmit={handleSubmit}>
        <div className="grid gap-2">
            <div className="flex flex-row gap-2">
                <Label className="w-32">Email:</Label>
                <Input
                    className="flex-1 border-foreground"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    id="email"
                    required
                    disabled={isLoading}
                />
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-32">Permissions:</Label>
                <Popover open={permissionsPopoverOpened} onOpenChange={setPermissionsPopoverOpened}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            disabled={isLoading}
                            aria-expanded={permissionsPopoverOpened}
                            className="flex-1 justify-between"
                        >
                            {permissionArray.length >= 3 ? `${permissionArray.length} selected` : joinTenantPermissions(permissionArray)}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandGroup>
                                {ALL_TENANT_PERMISSIONS.map((value, i) => (
                                    <CommandItem
                                        key={i}
                                        className={"cursor-pointer"}
                                        disabled={value === "MEMBER"}
                                        onSelect={() => {
                                            togglePermissions(value)
                                        }}
                                    >
                                        {getHumanReadableTenantPermission(value)}
                                        <Check
                                            className={cn(
                                                "ml-auto",
                                                permissionArray.includes(value) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            <Button disabled={isLoading} type={"submit"} className={'flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                { isLoading && <Spinner/> }
                Invite
            </Button>
        </div>
    </form>
}

const TenantMemberPage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [dialogOpened, setDialogOpened] = useState(false)
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const {tenantId, activeTenant} = useTenant()

    usePageTitle('Manage members')

    if (!activeTenant){
        return <></>
    }

    if (activeTenant.membership !== "OWNER" && !activeTenant.permissions.includes("LIST_USERS")){
        return <MainLayout>
            <div className={"flex flex-col flex-grow w-full justify-center gap-2"}>
                <div className={"w-full flex flex-row justify-center"}>
                    <Label className={"text-foreground font-bold text-4xl"}>
                        Forbidden
                    </Label>
                </div>
                <div className={"w-full flex flex-row justify-center"}>
                    <p className={"text-muted-foreground px-2 text-center"}>
                        You don't have enough clearance to list this tenant's users.
                    </p>
                </div>
            </div>
        </MainLayout>
    }

    return <MainLayout>
        { isDesktop ? <Dialog open={dialogOpened} onOpenChange={setDialogOpened}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add member</DialogTitle>
                    <DialogDescription>
                        Enter a user email to invite them. If the user does not exist, we will invite them through this email.
                    </DialogDescription>
                </DialogHeader>
                <div className={"w-full"}>
                    <InviteUserDialog isLoading={isLoading} setIsLoading={setIsLoading}/>
                </div>
            </DialogContent>
        </Dialog> : <Drawer open={dialogOpened} onOpenChange={setDialogOpened}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Add member</DrawerTitle>
                    <DrawerDescription>
                        Enter a user email to invite them. If the user does not exist, we will invite them through this email.
                    </DrawerDescription>
                </DrawerHeader>
                <div className={"w-full px-3 pb-3"}>
                    <InviteUserDialog isLoading={isLoading} setIsLoading={setIsLoading}/>
                </div>
            </DrawerContent>
        </Drawer> }
        <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-foreground font-bold"}>
                    Tenant members
                </Label>
            </div>
            <div className={"my-3 flex gap-2"}>
                <Button className={"text-background bg-primary border-2 border-primary cursor-pointer hover:border-solid hover:text-primary hover:bg-background"}
                        asChild>
                    <Link to={`/tenant/${tenantId}/partitions/browser/`}>
                        <Folder/>
                        <span>Browse partitions</span>
                    </Link>
                </Button>
                { ["OWNER", "MODERATOR"].includes(activeTenant.membership) && <Button className={"text-foreground border-dashed border-2 border-foreground cursor-pointer hover:border-solid hover:text-background hover:bg-foreground"}
                                                                        onClick={() => setDialogOpened(true)}
                                                                        disabled={isLoading}>
                    { isLoading ? <Spinner/> : <Plus/> }
                    <span>Invite user</span>
                </Button> }
            </div>
            <TenantMemberTable isLoading={isLoading} setIsLoading={setIsLoading} tenant={activeTenant}/>
        </div>
    </MainLayout>
}


export default TenantMemberPage
