import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import ProjectGuard from "@/interfaces/layouts/ProjectGuard.tsx";
import {Link, useLocation, useNavigate} from "react-router";
import {
    type FC, type ReactNode,
    useEffect, useMemo, useRef,
    useState
} from "react";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ChartPie, File, Plus} from "lucide-react";
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
import {extractAndEncodePathFragments, type ListingPathFragment} from "@/utils/path.ts";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from "@/components/ui/drawer.tsx";
import type {PartitionDto, UploadPartitionDto} from "@/dto/PartitionDto.ts";
import PartitionEditForm from "@/interfaces/components/PartitionEditForm.tsx";
import {notifyApiError} from "@/utils/errors.ts";
import axios from "axios";
import {toast} from "sonner";
import api from "@/api.ts";
import {base64ToUint8Array, decryptWithPrivateKey} from "@/utils/cryptography.ts";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";

const extractPath = (path: string): string => {
    let subPath = path.replace(/^\/listings\/browser\/?/, '');
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

const FileTable: FC<{ currentDir: string }> = ({ currentDir }) => {
    const [isLoading, setIsLoading] = useState(false)
    const [counter, setCounter] = useState(0)
    const [attachmentUploadOpened, setAttachmentUploadOpened] = useState(false)
    const [createPartitionOpened, setCreatePartitionOpened] = useState(false)
    const {userPrivateKey} = useAuthorization()
    const partitionRef = useRef(null as PartitionDto | null)
    const partitionKeyRef = useRef(null as Uint8Array | null)
    const navigate = useNavigate()
    const partitionCreationActions: ReactNode[] = [
        (<DropdownMenuItem className={"cursor-pointer"} onClick={() => setCreatePartitionOpened(true)}>
            <ChartPie/>
            <span>
                Partition
            </span>
        </DropdownMenuItem>)
    ]
    const listingCreationActions: ReactNode[] = [
        (<DropdownMenuItem className={"cursor-pointer"} onClick={() => setAttachmentUploadOpened(true)}>
            <File/>
            <span>
                Attachment
            </span>
        </DropdownMenuItem>)
    ]
    const creationActions = useMemo(() => currentDir.includes("/_/") ? listingCreationActions : partitionCreationActions, [currentDir])

    const refreshTrigger = () => {
        setCounter(c => c + 1)
    }

    const onFolderSelected = (path: string) => {
        const newPath = `/listings/browser${path}`;
        if (newPath === window.location.pathname){
            return
        }
        navigate(newPath)
    }

    const getPartitionKey = async () => {
        if (partitionKeyRef.current){
            return partitionKeyRef.current
        }

        if (!partitionRef.current){
            throw Error("Partition is not set")
        }

        const userKey = userPrivateKey!
        const decryptedPartitionKey = await decryptWithPrivateKey(userKey, base64ToUint8Array(partitionRef.current.userPartitionKey.cipher))
        partitionKeyRef.current = decryptedPartitionKey
        return decryptedPartitionKey
    }

    return <>
        <AttachmentUploadDialog isOpened={attachmentUploadOpened}
                                setIsOpened={setAttachmentUploadOpened}
                                isLoading={isLoading}
                                setIsLoading={setIsLoading}
                                refreshTrigger={refreshTrigger}
                                currentDir={currentDir}
                                partitionRef={partitionRef}
                                getPartitionKey={getPartitionKey}/>
        <CreatePartitionDialog isLoading={isLoading}
                               setIsLoading={setIsLoading}
                               isOpened={createPartitionOpened}
                               setIsOpened={setCreatePartitionOpened}
                               reloadTrigger={refreshTrigger}
                               currentDir={currentDir}/>
        <div className={"my-3"}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button className={"text-foreground border-dashed border-2 border-foreground cursor-pointer " +
                        "hover:border-solid hover:text-background hover:bg-foreground"}
                            onClick={() => {}} disabled={isLoading}>
                        { isLoading ? <Spinner/> : <Plus/> }
                        <span>Create...</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                    { creationActions }
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <ListingPicker key={counter}
                       isLoading={isLoading}
                       setIsLoading={setIsLoading}
                       currentDir={currentDir}
                       setCurrentDir={onFolderSelected}
                       partitionRef={partitionRef}
                       partitionKeyRef={partitionKeyRef}
                       links/>
    </>
}

const CurrentDirectory: FC<{ currentDir: string }> = ({ currentDir }) => {
    const [slices, setSlices] = useState([] as ListingPathFragment[])

    useEffect(() => {
        setSlices(extractAndEncodePathFragments(currentDir))
    }, [currentDir]);

    const counter = { i: 0 }
    return <>
        { slices.map((s, i) => <>
            <span key={counter.i++}>
                <Button className={"cursor-pointer bg-muted hover:bg-foreground hover:text-background mr-1 mb-1 flex flex-row max-w-fit"} asChild>
                    <Link to={`/listings/browser${s.url}`}>
                        { s.isPartition && <div ><ChartPie/></div> }
                        { i === 0 ? s.display : s.display.slice(0, s.display.length - 1) }
                    </Link>
                </Button>
            </span>
            { i > 0 ? <span key={counter.i++} className={'mr-1 mb-1 flex flex-col justify-center'}>/</span> : <></> }
        </>) }
    </>
}

const ListingsBrowser = () => {
    const location = useLocation()
    const [currentDir, setCurrentDir] = useState('/')
    const {activeProject} = useTenant()

    useEffect(() => {
        setCurrentDir(extractPath(location.pathname))
    }, [location]);

    return <MainLayout>
        <ProjectGuard>
            <div className={"w-full p-5 flex flex-col"}>
                <div className={"my-2"}>
                    <Label className={"text-2xl text-foreground font-bold"}>
                        Listing browser
                    </Label>
                    <span className={"flex flex-wrap mt-2"}>
                        <div className={"text-foreground text-sm flex flex-col justify-center mb-1"}>
                            Current directory:&nbsp;
                        </div>
                        <CurrentDirectory currentDir={currentDir}/>
                    </span>
                </div>
                <FileTable key={`${activeProject?.id ?? 0}:${currentDir}`} currentDir={currentDir}/>
            </div>
        </ProjectGuard>
    </MainLayout>
}

export default ListingsBrowser