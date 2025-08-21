import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable
} from "@tanstack/react-table";
import type {PartitionUserDto} from "@/dto/tenant/PartitionUserDto.ts";
import {joinPartitionPermissions} from "@/dto/Permissions.ts";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, ChevronDown, Plus} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {type FC, useEffect, useRef, useState} from "react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import type {TanstackTable} from "@/dto/aliases.ts";
import LinkWrapper from "@/interfaces/components/LinkWrapper.tsx";
import api, {createApi} from "@/api.ts";
import type {PartitionDto} from "@/dto/tenant/PartitionDto.ts";
import {Link, useLocation, useNavigate} from "react-router";
import {notifyApiError} from "@/utils/errors.ts";
import type {PageDto} from "@/dto/PageDto.ts";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {encodedListingPath, useQuery} from "@/utils/path.ts";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from "@/components/ui/drawer.tsx";
import axios, {type AxiosInstance} from "axios";
import {toast} from "sonner";
import PartitionMemberEditForm from "@/interfaces/components/PartitionMemberEditForm.tsx";
import type {UserInfoDto} from "@/dto/user/UserInfoDto.ts";
import {
    base64ToUint8Array,
    decryptWithPrivateKey,
    encryptWithPublicKey,
    uint8ArrayToBase64
} from "@/utils/cryptography.ts";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {useTenant} from "@/contexts/TenantContext.tsx";
import ConfirmationDialog from "@/interfaces/components/ConfirmationDialog.tsx";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import {PrivateKeyDecryptor} from "@/interfaces/components/PrivateKeyDecryptor.tsx";

const itemsColumnDef: ColumnDef<PartitionUserDto>[] = [
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
        accessorFn: p => joinPartitionPermissions(p.permissions),
        header: "Permissions"
    },
]

const possiblePageSizes = [5, 10, 50, 100]

const extractPath = (path: string): string => {
    let subPath = path.replace(/^\/tenant\/[^/]+\/partitions\/members\/?/, '');
    subPath = decodeURIComponent(subPath)
    subPath = subPath ? subPath : '/'
    subPath = subPath.startsWith('/') ? subPath : ('/' + subPath)
    return subPath
}

const PartitionMemberTable: FC<{
    isLoading: boolean,
    setIsLoading: (l: boolean) => void,
    partition: PartitionDto,
    api: AxiosInstance,
}> = ({ isLoading, setIsLoading, partition, api }) => {
    const [items, setItems] = useState([] as PartitionUserDto[])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [pageCount, setPageCount] = useState(0);
    const [sorting, setSorting] = useState<SortingState>([]);
    const navigate = useNavigate()
    const table: TanstackTable<PartitionUserDto> = useReactTable({
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

            let url = `partitions/members?page=${pageIndex + 1}&pageSize=${pageSize}`
            if (sortParams !== null){
                url = `${url}&orderBy=${encodeURIComponent(sortParams)}`
            }
            const response = await api.get(url)
            const page = response.data as PageDto<PartitionUserDto>
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
    }, [pagination, sorting, partition]);

    const getManageUserUrl = (u: PartitionUserDto) => {
        return location.pathname + `?user=${encodeURIComponent(u.email)}`
    }

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
                                onClick={() => navigate(getManageUserUrl(row.original))}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        <LinkWrapper to={getManageUserUrl(row.original)}
                                                     enableLinks={true}
                                                     onClick={() => navigate(getManageUserUrl(row.original))}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </LinkWrapper>
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

const PartitionMemberTableWithAddButton: FC<{
    isLoading: boolean,
    setIsLoading: (l: boolean) => void,
    partition: PartitionDto,
    api: AxiosInstance,
}> = ({ isLoading, setIsLoading, partition, api }) => {
    const [dialogOpened, setDialogOpened] = useState(false)
    const [counter, setCounter] = useState(0)
    const {tenantId} = useTenant()
    const {userPrivateKey} = useAuthorization()
    const isDesktop = useMediaQuery("(min-width: 768px)")

    const getPartitionKey = async () => {
        const userKey = userPrivateKey!
        return await decryptWithPrivateKey(userKey, base64ToUint8Array(partition!.userPartitionKey.cipher))
    }

    const onMemberAdded = async (partitionUser: PartitionUserDto) => {
        setIsLoading(true)

        try {
            let userInfo = null as UserInfoDto | null
            try {
                const getUserResp = await api.get(`auth?userEmail=${encodeURIComponent(partitionUser.email)}`)
                userInfo = getUserResp.data as UserInfoDto
            } catch (e){
                if (axios.isAxiosError(e) && e.status === 403){
                    toast.error("User not found")
                    return
                }
            }
            const pem = base64ToUint8Array(userInfo!.publicRsaKey)
            const publicKey = await crypto.subtle.importKey(
                "spki",
                pem,
                {
                    name: 'RSA-OAEP',
                    hash: { name: 'SHA-256' }
                },
                false,
                ["encrypt"]
            );
            const partitionKey = await getPartitionKey()
            const wrappedPartitionUserKey = uint8ArrayToBase64(await encryptWithPublicKey(publicKey, partitionKey))

            let permissions = 0
            if (partitionUser.permissions.includes("WRITE")){
                permissions = permissions | 1
            }
            if (partitionUser.permissions.includes("MODERATE")){
                permissions = permissions | 2
            }

            await api.post('partitions/members', {
                email: partitionUser.email,
                wrappedPartitionUserKey,
                permissions
            })

            setDialogOpened(false)
            setCounter(c => c + 1)
        } catch (e) {
            if (axios.isAxiosError(e) && e.status === 409){
                toast.error("Member already added")
            } else {
                notifyApiError(e)
            }
        } finally {
            setIsLoading(false)
        }
    }

    return <>
        { isDesktop ? <Dialog open={dialogOpened} onOpenChange={setDialogOpened}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add member</DialogTitle>
                    <DialogDescription>
                        { userPrivateKey
                            ? "Add a new tenant member to this partition."
                            : "Unlock this session to continue"}
                    </DialogDescription>
                </DialogHeader>
                <div className={"w-full"}>
                    { userPrivateKey
                        ? <PartitionMemberEditForm disabled={isLoading} onSave={onMemberAdded}/>
                        : <PrivateKeyDecryptor isLoading={isLoading} setIsLoading={setIsLoading}/>}
                </div>
            </DialogContent>
        </Dialog> : <Drawer open={dialogOpened} onOpenChange={setDialogOpened}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Add member</DrawerTitle>
                    <DrawerDescription>
                        { userPrivateKey
                            ? "Add a new tenant member to this partition."
                            : "Unlock this session to continue"}
                    </DrawerDescription>
                </DrawerHeader>
                <div className={"w-full px-3 pb-3"}>
                    { userPrivateKey
                        ? <PartitionMemberEditForm disabled={isLoading} onSave={onMemberAdded}/>
                        : <PrivateKeyDecryptor isLoading={isLoading} setIsLoading={setIsLoading}/> }
                </div>
            </DrawerContent>
        </Drawer> }
        <div className={"my-3 flex gap-2"}>
            <Button className={"text-background bg-foreground border-2 border-foreground cursor-pointer hover:border-solid hover:text-foreground hover:bg-background"}
                    asChild>
                <Link to={`/tenant/${tenantId}/partitions/browser/${encodedListingPath(partition.partitionPath)}/_/`}>
                    <ArrowLeft/>
                    <span>Back to partition</span>
                </Link>
            </Button>
            { partition.permissions.includes("MODERATE") && <Button className={"text-foreground border-dashed border-2 border-foreground cursor-pointer hover:border-solid hover:text-background hover:bg-foreground"}
                    onClick={() => setDialogOpened(true)}
                    disabled={isLoading}>
                { isLoading ? <Spinner/> : <Plus/> }
                <span>Add member</span>
            </Button> }
        </div>
        <PartitionMemberTable key={counter}
                              isLoading={isLoading}
                              setIsLoading={setIsLoading}
                              partition={partition}
                              api={api}/>
    </>
}

const ManagePartitionMember: FC<{
    isLoading: boolean,
    setIsLoading: (l: boolean) => void,
    partition: PartitionDto,
    api: AxiosInstance,
    userEmail: string
}> = ({ isLoading, setIsLoading, partition, api, userEmail }) => {
    const [confirmDeleteOpened, setConfirmDeleteOpened] = useState(false)
    const [user, setUser] = useState(null as PartitionUserDto | null)
    const [selfInfo, setSelfInfo] = useState(null as UserInfoDto | null)
    const {getUserInfo} = useAuthorization()
    const {tenantId} = useTenant()
    const location = useLocation()
    const navigate = useNavigate()

    const fetchSelf = async () => {
        try {
            setIsLoading(true)
            setSelfInfo(await getUserInfo())
        } catch (e){
            notifyApiError(e)
        } finally{
            setIsLoading(false)
        }
    }

    const fetchUser = async (email: string) => {
        try {
            setIsLoading(true)
            const response = await api.get(`partitions/members/member?email=${encodeURIComponent(email)}`)
            const p = response.data as PartitionUserDto
            setUser(p)
        } catch (e){
            notifyApiError(e)
        } finally{
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchUser(userEmail).then(undefined)
    }, [userEmail]);

    useEffect(() => {
        fetchSelf().then(undefined)
    }, []);

    const onSave = async (partitionUser: PartitionUserDto) => {
        let permissions = 0
        if (partitionUser.permissions.includes("WRITE")){
            permissions = permissions | 1
        }
        if (partitionUser.permissions.includes("MODERATE")){
            permissions = permissions | 2
        }

        try {
            setIsLoading(true)

            await api.patch('partitions/members', {
                email: partitionUser.email,
                permissions
            })

            toast.success("Member updated")
            navigate(location.pathname)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const onDelete = async () => {
        try {
            setIsLoading(true)

            await api.delete(`partitions/members?email=${encodeURIComponent(userEmail)}`)
            toast.success("Member removed")
            navigate(`/tenant/${tenantId}/partitions/browser/`)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    return <>
        <ConfirmationDialog confirmationOpened={confirmDeleteOpened}
                            setConfirmationOpened={setConfirmDeleteOpened}
                            onAccepted={onDelete}
                            title={'Remove member'}
                            message={selfInfo?.email === (user?.email ?? '') ? 'Do you want to remove yourself from this partition?' : 'Are you sure you want to remove this member?'}
                            acceptText={'Remove'}
                            destructive/>
        <div className={"my-3 flex gap-2"}>
            <Button className={"text-background bg-foreground border-2 border-foreground cursor-pointer hover:border-solid hover:text-foreground hover:bg-background"}
                    asChild>
                <Link to={location.pathname}>
                    <ArrowLeft/>
                    <span>Back to members</span>
                </Link>
            </Button>
        </div>
        <div className={"my-3 w-full"}>
            <div className={"lg:w-1/2 text-foreground flex flex-col gap-2"}>
                { user && <PartitionMemberEditForm partitionMember={user}
                                                   disabled={isLoading || selfInfo?.email === user.email || !partition.permissions.includes("MODERATE")}
                                                   onSave={onSave}/> }
                { (partition.permissions.includes("MODERATE") || (!!selfInfo && userEmail === selfInfo.email)) && <Button className={"cursor-pointer bg-destructive text-background border-destructive border-1 hover:bg-background hover:text-destructive"} onClick={() => setConfirmDeleteOpened(true)}>
                    Remove member
                </Button> }
            </div>
        </div>
    </>
}

const PartitionMembersPage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [userEmail, setUserEmail] = useState(null as string | null)
    const [partition, setPartition] = useState(null as PartitionDto | null)
    const partitionIdRef = useRef(null as number | null)
    const localApi = createApi(partitionIdRef)
    const query = useQuery()
    const location = useLocation()

    const getPartition = async (path: string): Promise<PartitionDto> => {
        const pResponse = await api.get(`partitions/partition?partitionPath=${encodeURIComponent(path)}`)
        return pResponse.data as PartitionDto
    }

    useEffect(() => {
        const path = extractPath(location.pathname)
        getPartition(path)
            .then(p => {
                setPartition(p)
                partitionIdRef.current = p.id
            })
            .catch(e => notifyApiError(e))
    }, [location]);

    useEffect(() => {
        const user = query.get("user")
        if (user){
            setUserEmail(user)
        } else {
            setUserEmail(null)
        }
    }, [query]);

    return <MainLayout>
        <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-foreground font-bold"}>
                    { userEmail ? "Manage partition member" : (!!partition && partition.permissions.includes("MODERATE")) ? "Manage partition members" : "Partition members" }
                </Label>
            </div>
            { partition ? (userEmail
                ? <ManagePartitionMember isLoading={isLoading}
                                         setIsLoading={setIsLoading}
                                         userEmail={userEmail}
                                         api={localApi}
                                         partition={partition}/>
                : <PartitionMemberTableWithAddButton isLoading={isLoading}
                                                     setIsLoading={setIsLoading}
                                                     partition={partition}
                                                     api={localApi}/>)
                : <FullSizeSpinner/> }
        </div>
    </MainLayout>
}

export default PartitionMembersPage;