import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import ProjectGuard from "@/interfaces/layouts/ProjectGuard.tsx";
import {Link, useLocation, useNavigate} from "react-router";
import {
    type DragEvent,
    type FC, type ReactNode, type SyntheticEvent,
    useEffect, useMemo, useRef,
    useState
} from "react";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {File as FileIcon, KanbanSquare, KeyRound, Plus, Users, Vault} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import AttachmentUploadDialog from "@/interfaces/components/AttachmentUploadDialog.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {useTenant} from "@/contexts/TenantContext.tsx";
import ListingPicker from "@/interfaces/components/ListingPicker.tsx";
import {
    encodedListingPath,
    extractAndEncodePathFragments,
    type ListingPathFragment,
    splitByFirst
} from "@/utils/path.ts";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from "@/components/ui/drawer.tsx";
import type {PartitionDto, UploadPartitionDto} from "@/dto/tenant/PartitionDto.ts";
import PartitionEditForm from "@/interfaces/components/PartitionEditForm.tsx";
import {notifyApiError} from "@/utils/errors.ts";
import axios from "axios";
import {toast} from "sonner";
import api, {createApi} from "@/api.ts";
import type {PartitionUserDto} from "@/dto/tenant/PartitionUserDto.ts";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb.tsx";
import {Card} from "@/components/ui/card.tsx";
import {base64ToUint8Array, decryptWithPrivateKey, digestMd5, uint8ArrayToBase64} from "@/utils/cryptography.ts";
import type {AttachmentPresignedDto} from "@/dto/AttachmentPresignedDto.ts";
import {useServerCommunication} from "@/contexts/ServerCommunicationContext.tsx";
import type {Callback} from "@/utils/misc.ts";
import {cn} from "@/lib/utils.ts";
import type {UploadProjectDto} from "@/dto/tenant/UploadProjectDto.ts";
import ProjectEditForm from "@/interfaces/components/ProjectEditForm.tsx";
import {useConsent} from "@/contexts/ConsentContext.tsx";
import {usePageTitle} from "@/hooks/use-page-title.ts";

const extractPath = (path: string): string => {
    let subPath = path.replace(/^\/tenant\/[^/]+\/partitions\/browser\/?/, '');
    subPath = decodeURIComponent(subPath)
    subPath = subPath ? subPath : '/'
    subPath = subPath.endsWith('/') ? subPath : (subPath + '/')
    subPath = subPath.startsWith('/') ? subPath : ('/' + subPath)
    return subPath
}

const CreatePartitionDialog: FC<{
    isLoading: boolean,
    setIsLoading: (l: boolean) => void,
    isOpened: boolean,
    setIsOpened: (o: boolean) => void,
    currentDir: string,
    reloadTrigger: () => void,
}> = ({ isLoading, setIsLoading, isOpened, setIsOpened, currentDir, reloadTrigger }) => {
    const [values, setValues] = useState({ partitionPath: currentDir, serverSideKeyDerivation: false } as UploadPartitionDto)
    const isDesktop = useMediaQuery("(min-width: 768px)")

    useEffect(() => {
        setValues({ partitionPath: currentDir, serverSideKeyDerivation: false })
    }, [isOpened]);

    const onSubmit = async (partition: UploadPartitionDto) => {
        try {
            setValues(partition)
            setIsLoading(true)
            await api.post("partitions", partition)
            setIsOpened(false)
            reloadTrigger()
        } catch (e: unknown){
            if (axios.isAxiosError(e) && e.status === 409){
                toast.error('Partition with the same path already exists')
            } else {
                notifyApiError(e)
            }
        } finally {
            setIsLoading(false)
        }
    }

    return isDesktop ? <Dialog open={isOpened} onOpenChange={setIsOpened}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Create a new partition</DialogTitle>
                <DialogDescription>Partitions organize data into isolated compartments, each with its own encryption settings.</DialogDescription>
            </DialogHeader>
            <div className={"w-full"}>
                <PartitionEditForm partition={values} isLoading={isLoading} onSave={onSubmit}/>
            </div>
        </DialogContent>
    </Dialog> : <Drawer open={isOpened} onOpenChange={setIsOpened}>
        <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>Create a new partition</DrawerTitle>
                <DrawerDescription>Partitions organize data into isolated compartments, each with its own encryption settings.</DrawerDescription>
            </DrawerHeader>
            <div className={"p-5"}>
                <PartitionEditForm partition={values} isLoading={isLoading} onSave={onSubmit}/>
            </div>
        </DrawerContent>
    </Drawer>
}

const CreateProjectDialog: FC<{
    isLoading: boolean,
    setIsLoading: (l: boolean) => void,
    isOpened: boolean,
    setIsOpened: (o: boolean) => void,
    currentDir: string,
    reloadTrigger: () => void,
}> = ({ isLoading, setIsLoading, isOpened, setIsOpened, currentDir, reloadTrigger }) => {
    const [values, setValues] = useState({ partitionPath: currentDir, serverSideKeyDerivation: false, uniqueIdentifier: '' } as UploadProjectDto)
    const isDesktop = useMediaQuery("(min-width: 768px)")

    useEffect(() => {
        setValues({ partitionPath: currentDir, serverSideKeyDerivation: false, uniqueIdentifier: "" })
    }, [isOpened]);

    const onSubmit = async (partition: UploadProjectDto) => {
        try {
            setValues(partition)
            setIsLoading(true)
            await api.post("partitions", {
                ...partition,
                uniqueIdentifier: undefined,
                partitionType: 'PROJECT',
                projectPartition: {
                    uniqueIdentifier: partition.uniqueIdentifier
                }
            })
            setIsOpened(false)
            reloadTrigger()
        } catch (e: unknown){
            if (axios.isAxiosError(e) && e.status === 409){
                toast.error('Partition with the same path already exists')
            } else {
                notifyApiError(e)
            }
        } finally {
            setIsLoading(false)
        }
    }

    return isDesktop ? <Dialog open={isOpened} onOpenChange={setIsOpened}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Create a new project partition</DialogTitle>
                <DialogDescription>Create a new software project with kanban boards and sprints.</DialogDescription>
            </DialogHeader>
            <div className={"w-full"}>
                <ProjectEditForm partition={values} isLoading={isLoading} onSave={onSubmit}/>
            </div>
        </DialogContent>
    </Dialog> : <Drawer open={isOpened} onOpenChange={setIsOpened}>
        <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>Create a new project</DrawerTitle>
                <DrawerDescription>Create a new software project with kanban boards and sprints.</DrawerDescription>
            </DrawerHeader>
            <div className={"p-5"}>
                <ProjectEditForm partition={values} isLoading={isLoading} onSave={onSubmit}/>
            </div>
        </DrawerContent>
    </Drawer>
}

const FileTable: FC<{ currentDir: string, partitionPath: string | null }> = ({ currentDir, partitionPath }) => {
    const [isLoading, setIsLoading] = useState(false)
    const [dropEnabled, setDropEnabled] = useState(false)
    const [counter, setCounter] = useState(0)
    const [attachmentUploadOpened, setAttachmentUploadOpened] = useState(false)
    const [createPartitionOpened, setCreatePartitionOpened] = useState(false)
    const [createProjectOpened, setCreateProjectOpened] = useState(false)
    const [canManageMembership, setCanManageMembership] = useState(false)
    const partitionRef = useRef(null as PartitionDto | null)
    const partitionKeyRef = useRef(null as Uint8Array | null)
    const {tenantId} = useTenant()
    const {requireDecryption} = useConsent()
    const {wrapSecret} = useServerCommunication()
    const navigate = useNavigate()
    const partitionCreationActions: ReactNode[] = [
        (<DropdownMenuItem className={"cursor-pointer"} onClick={() => setCreatePartitionOpened(true)}>
            <Vault/>
            <span>
                Partition
            </span>
        </DropdownMenuItem>),
        (<DropdownMenuItem className={"cursor-pointer"} onClick={() => setCreateProjectOpened(true)}>
            <KanbanSquare/>
            <span>
                Project
            </span>
        </DropdownMenuItem>)
    ]
    const listingCreationActions: ReactNode[] = [
        (<DropdownMenuItem className={"cursor-pointer"} onClick={() => setAttachmentUploadOpened(true)}>
            <FileIcon/>
            <span>
                Attachment
            </span>
        </DropdownMenuItem>),
        (<DropdownMenuItem className={"cursor-pointer"} disabled={true}>
            <KeyRound/>
            <span>
                Password
            </span>
        </DropdownMenuItem>)
    ]
    const creationActions = useMemo(() => partitionPath ? listingCreationActions : partitionCreationActions, [partitionPath])

    useEffect(() => {
        if (!partitionPath){
            setCanManageMembership(false)
            return
        }
        (async () => {
            const pResponse = await api.get(`partitions/partition?partitionPath=${encodeURIComponent(partitionPath)}`)
            const p = pResponse.data as PartitionDto

            const localApi = createApi({ current: p.id })
            const puResponse = await localApi.get("partitions/members/self")
            const pu = puResponse.data as PartitionUserDto
            const manage = pu.permissions.includes("MODERATE")
            setCanManageMembership(manage)
        })()
    }, [partitionPath]);

    const refreshTrigger = () => {
        setCounter(c => c + 1)
    }

    const onFolderSelected = (path: string) => {
        const newPath = `/tenant/${tenantId}/partitions/browser${path}`;
        if (newPath === window.location.pathname){
            return
        }
        navigate(newPath)
    }

    const getPartitionKey = async (userKey: CryptoKey) => {
        const decryptedPartitionKey = await decryptWithPrivateKey(userKey, base64ToUint8Array(partitionRef.current!.userPartitionKey.cipher))
        partitionKeyRef.current = decryptedPartitionKey
        return decryptedPartitionKey
    }

    const uploadPresignedPart = async <T extends number | null> (url: string, partitionKeyMd5Base64: string, partitionKeyBase64: string, file: Blob, part: T, onPercentChanged: Callback<number>) => {
        const response = await axios.put(url, file, {
            headers: {
                'content-type': 'application/octet-stream',
                'x-amz-server-side-encryption-customer-algorithm': 'AES256',
                'x-amz-server-side-encryption-customer-key-md5': partitionKeyMd5Base64,
                'x-amz-server-side-encryption-customer-key': partitionKeyBase64,
            },

            onUploadProgress: progressEvent => {
                const total = progressEvent.total ?? 1;
                let percentCompleted = Math.round((progressEvent.loaded * 100) / total);
                percentCompleted = percentCompleted > 100 ? 10 : percentCompleted;
                onPercentChanged(percentCompleted);
            }
        })

        return {
            part,
            etag: response.headers.etag as string
        }
    }

    const uploadPresigned = async (userKey: CryptoKey, file: File, selectedPath: string, onPercentChanged: Callback<number>) => {
        const partitionIdRef = { current: null as number | null }
        const api = createApi(partitionIdRef)
        partitionIdRef.current = partitionRef.current?.id ?? null

        const partitionKey = await getPartitionKey(userKey)
        const partitionKeyMd5 = digestMd5(partitionKey)

        const partitionKeyBase64 = uint8ArrayToBase64(partitionKey)
        const partitionKeyMd5Base64 = uint8ArrayToBase64(partitionKeyMd5)

        const presignedResponse = await api.post('listings/attachment/presigned', {
            path: selectedPath,
            keyMd5: partitionKeyMd5Base64,
            mimeType: file.type,
            contentLength: file.size
        })
        const presigned = presignedResponse.data as AttachmentPresignedDto;

        try {
            await uploadPresignedPart(presigned.url, partitionKeyMd5Base64, partitionKeyBase64, file, null, onPercentChanged)
            await api.post('listings/attachment/complete', {
                id: presigned.id
            })
        } catch (e){
            await api.delete(`listings/attachment?id=${encodeURIComponent(presigned.id)}`).catch(() => {})
            throw e
        }
    }

    const directUpload = async (userKey: CryptoKey, file: File, selectedPath: string, onPercentChanged: Callback<number>) => {
        const partitionIdRef = { current: null as number | null }
        const api = createApi(partitionIdRef)
        partitionIdRef.current = partitionRef.current?.id ?? null

        const partitionKey = await getPartitionKey(userKey)
        const partitionKeyBase64 = uint8ArrayToBase64(partitionKey)

        const encryptedPartitionKey = await wrapSecret(Uint8Array.from(partitionKeyBase64.split("").map(x => x.charCodeAt(0))))
        const data = new FormData();
        data.append("file", file)
        await api.post(`listings/attachment?listingPath=${selectedPath}`, data, {
            headers: {
                'content-type': 'multipart/form-data',
                'x-encryption-key': encryptedPartitionKey
            },

            onUploadProgress: progressEvent => {
                const total = progressEvent.total ?? 1;
                let percentCompleted = Math.round((progressEvent.loaded * 100) / total);
                percentCompleted = percentCompleted > 100 ? 10 : percentCompleted;
                onPercentChanged(percentCompleted);
            }
        })
    }

    const uploadFile = async (file: File, selectedPath: string, onPercentChanged: Callback<number>) => {
        const userKey = await requireDecryption()
        if (partitionRef.current!.serverSideKeyDerivation){
            return await directUpload(userKey, file, selectedPath, onPercentChanged)
        } else {
            return await uploadPresigned(userKey, file, selectedPath, onPercentChanged)
        }
    }

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setDropEnabled(false)

        setIsLoading(true)
        const stat = { success: 0, fail: 0 }
        const filePath = '/' + splitByFirst(currentDir, '/_/')[1]
        const fileList = Array.from(e.dataTransfer.files)
        const promises = [] as Promise<void>[]

        try {
            for (const file of fileList) {
                const promise = (async () => {
                    const toastId = toast.info(`Uploading ${file.name}…`)
                    try {
                        await uploadFile(file, `${filePath}${file.name}`, p => {
                            toast.info(`Uploading ${file.name}… ${p}%`, {
                                id: toastId
                            })
                        })
                        toast.success(`Uploaded ${file.name}`,{
                            id: toastId
                        })
                        stat.success++
                    } catch (e){
                        if (axios.isAxiosError(e) && e.status === 409){
                            toast.error("Listing with the same path already exists", {
                                id: toastId
                            })
                        } else {
                            notifyApiError(e, toastId)
                        }
                        stat.fail++
                    }
                })()
                promises.push(promise)
            }

            await Promise.all(promises)
        } finally {
            setIsLoading(false)
            if (stat.fail && promises.length > 1){
                toast.info(`${stat.fail} files failed to upload`)
            }
            if (stat.success){
                refreshTrigger()
            }
        }
    }

    const handleDragOver = (e: SyntheticEvent) => {
        e.preventDefault()
        setDropEnabled(true)
    }

    const handleDragLeave = () => {
        setDropEnabled(false)
    }

    return <>
        <AttachmentUploadDialog isOpened={attachmentUploadOpened}
                                setIsOpened={setAttachmentUploadOpened}
                                isLoading={isLoading}
                                setIsLoading={setIsLoading}
                                refreshTrigger={refreshTrigger}
                                currentDir={currentDir}
                                uploadHandler={uploadFile}/>
        <CreatePartitionDialog isLoading={isLoading}
                               setIsLoading={setIsLoading}
                               isOpened={createPartitionOpened}
                               setIsOpened={setCreatePartitionOpened}
                               reloadTrigger={refreshTrigger}
                               currentDir={currentDir}/>
        <CreateProjectDialog isLoading={isLoading}
                             setIsLoading={setIsLoading}
                             isOpened={createProjectOpened}
                             setIsOpened={setCreateProjectOpened}
                             reloadTrigger={refreshTrigger}
                             currentDir={currentDir}/>
        <div className={"my-3"}>
            <div className={"flex gap-2"}>
                { !partitionPath &&   <Button className={"text-background bg-primary border-2 border-primary cursor-pointer hover:border-solid hover:text-primary hover:bg-background"}
                                              asChild>
                    <Link to={`/tenant/${tenantId}/members`}>
                        { isLoading ? <Spinner/> : <Users/> }
                        <span>Tenant members</span>
                    </Link>
                </Button> }
                { partitionPath && <Button className={"text-background bg-primary border-2 border-primary cursor-pointer hover:text-primary hover:bg-background"}
                                           disabled={isLoading}
                                           asChild>
                    <Link to={`/tenant/${tenantId}/partitions/members/${encodedListingPath(partitionPath)}`}>
                        { isLoading ? <Spinner/> : <Users/> }
                        <span>{ canManageMembership ? "Manage partition" : "Partition members" }</span>
                    </Link>
                </Button> }
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className={"text-foreground border-dashed border-2 border-foreground cursor-pointer " +
                            "hover:border-solid hover:text-background hover:bg-foreground"}
                                disabled={isLoading}>
                            { isLoading ? <Spinner/> : <Plus/> }
                            <span>Create...</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                        { creationActions }
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        <div className={"flex flex-col flex-grow w-full relative"}
             onDrop={partitionPath ? handleDrop : undefined}
             onDragOver={partitionPath ? handleDragOver : undefined}
             onDragLeave={partitionPath ? handleDragLeave : undefined}>
            <div key={counter}
                 className={cn(dropEnabled ? "invisible" : "")}>
                <ListingPicker isLoading={isLoading}
                               setIsLoading={setIsLoading}
                               currentDir={currentDir}
                               setCurrentDir={onFolderSelected}
                               partitionRef={partitionRef}
                               partitionKeyRef={partitionKeyRef}
                               links/>
            </div>
            { dropEnabled && <>
                <>
                    <Card className={"absolute inset-0 p-6 border-2 border-dashed rounded-2xl text-center transition-colors w-full min-h-12 flex flex-col flex-grow"}>
                        <div className={"flex flex-col flex-grow justify-center text-muted-foreground text-4xl"}>
                            Drop your files here
                        </div>
                    </Card>
                </>
            </> }
        </div>
    </>
}

const CurrentDirectory: FC<{ currentDir: string }> = ({ currentDir }) => {
    const [slices, setSlices] = useState([] as ListingPathFragment[])
    const {tenantId} = useTenant()
    const pageTitle = useMemo(() => slices.length > 1 ? 'Browsing ' + slices[slices.length - 1].display : 'Browsing', [slices])

    usePageTitle(pageTitle)

    useEffect(() => {
        setSlices(extractAndEncodePathFragments(currentDir))
    }, [currentDir]);

    return <Breadcrumb>
        <BreadcrumbList>
            <>
                { slices.map((s, i) => <>
                    { i === 0 ? <></> : <div className={"flex items-center"}><BreadcrumbSeparator/></div> }
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to={`/tenant/${tenantId}/partitions/browser${s.url}`} className={"flex items-center gap-1"}>
                                { s.isPartition && <div ><Vault/></div> }
                                { i === 0 ? "All partitions" : s.display.slice(0, s.display.length - 1) }
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                </>) }
            </>
        </BreadcrumbList>
    </Breadcrumb>
}

const PartitionsBrowserPage = () => {
    const location = useLocation()
    const [currentDir, setCurrentDir] = useState('/')
    const partitionPath = useMemo<string | null>(() => {
        const split = splitByFirst(currentDir, '/_/')
        return split.length === 1 ? null : split[0]
    }, [currentDir])

    useEffect(() => {
        setCurrentDir(extractPath(location.pathname))
    }, [location]);

    return <MainLayout>
        <ProjectGuard>
            <div className={"w-full p-5 flex flex-col flex-grow"}>
                <div className={"my-2"}>
                    <Label className={"text-2xl text-foreground font-bold"}>
                        { partitionPath ? "Listing browser" : "Partition browser" }
                    </Label>
                </div>
                <div className={"my-2"}>
                    <CurrentDirectory currentDir={currentDir}/>
                </div>
                <FileTable key={currentDir}
                           partitionPath={partitionPath}
                           currentDir={currentDir}/>
            </div>
        </ProjectGuard>
    </MainLayout>
}

export default PartitionsBrowserPage