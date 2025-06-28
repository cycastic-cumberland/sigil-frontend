import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import ProjectGuard from "@/interfaces/layouts/ProjectGuard.tsx";
import {Link, useLocation, useNavigate} from "react-router";
import {
    type FC,
    useEffect,
    useState
} from "react";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {File, Hash, Plus, Text} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import AttachmentUploadDialog from "@/interfaces/components/AttachmentUploadDialog.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {useProject} from "@/contexts/ProjectContext.tsx";
import ListingPicker from "@/interfaces/components/ListingPicker.tsx";
import {extractAndEncodePathFragments} from "@/utils/path.ts";

const extractPath = (path: string): string => {
    let subPath = path.replace(/^\/listings\/browser\/?/, '');
    subPath = decodeURIComponent(subPath)
    subPath = subPath ? subPath : '/'
    subPath = subPath.endsWith('/') ? subPath : (subPath + '/')
    subPath = subPath.startsWith('/') ? subPath : ('/' + subPath)
    return subPath
}

const FileTable: FC<{ currentDir: string }> = ({ currentDir }) => {
    const [isLoading, setIsLoading] = useState(false)
    const [counter, setCounter] = useState(0)
    const [attachmentUploadOpened, setAttachmentUploadOpened] = useState(false)
    const navigate = useNavigate()

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

    return <>
        <AttachmentUploadDialog isOpened={attachmentUploadOpened}
                                setIsOpened={setAttachmentUploadOpened}
                                isLoading={isLoading}
                                setIsLoading={setIsLoading}
                                refreshTrigger={refreshTrigger}
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
                    <DropdownMenuItem className={"cursor-pointer"} disabled={true}>
                        <Text/>
                        <span>
                            Text
                        </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className={"cursor-pointer"} disabled={true}>
                        <Hash/>
                        <span>
                            Decimal
                        </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className={"cursor-pointer"} onClick={() => setAttachmentUploadOpened(true)}>
                        <File/>
                        <span>
                            Attachment
                        </span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <ListingPicker key={counter}
                       isLoading={isLoading}
                       setIsLoading={setIsLoading}
                       currentDir={currentDir}
                       setCurrentDir={onFolderSelected} links/>
    </>
}

const CurrentDirectory: FC<{ currentDir: string }> = ({ currentDir }) => {
    const [slices, setSlices] = useState([] as { display: string, url: string }[])

    useEffect(() => {
        setSlices(extractAndEncodePathFragments(currentDir))
    }, [currentDir]);

    return <>
        { slices.map((s, i) => <>
            <span key={i * 2}>
                <Button className={"cursor-pointer bg-muted hover:bg-foreground hover:text-background mr-1 mb-1"} asChild>
                    <Link to={`/listings/browser${s.url}`}>
                        { i === 0 ? s.display : s.display.slice(0, s.display.length - 1) }
                    </Link>
                </Button>
            </span>
            { i > 0 ? <span key={(i * 2) + 1} className={'mr-1'}>/</span> : <></> }
        </>) }
    </>
}

const ListingsBrowser = () => {
    const location = useLocation()
    const [currentDir, setCurrentDir] = useState('/')
    const {activeProject} = useProject()

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
                    <p className={"text-foreground text-sm"}>
                        Current directory:&nbsp;
                        <CurrentDirectory currentDir={currentDir}/>
                    </p>
                </div>
                <FileTable key={`${activeProject?.id ?? 0}:${currentDir}`} currentDir={currentDir}/>
            </div>
        </ProjectGuard>
    </MainLayout>
}

export default ListingsBrowser