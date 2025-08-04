import {
    type ChangeEvent,
    type DragEvent,
    type FC,
    type SyntheticEvent,
    useEffect,
    useRef,
    useState
} from "react";
import axios from "axios";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Card} from "@/components/ui/card.tsx";
import {cn} from "@/lib/utils.ts";
import {Button} from "@/components/ui/button.tsx";
import {Progress} from "@/components/ui/progress.tsx";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from "@/components/ui/drawer.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {toast} from "sonner";
import {splitByFirst} from "@/utils/path.ts";
import {notifyApiError} from "@/utils/errors.ts";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {PrivateKeyDecryptor} from "@/interfaces/components/PrivateKeyDecryptor.tsx";
import type {Callback} from "@/utils/misc.ts";

const AttachmentUploadDialog: FC<{
    isOpened: boolean,
    setIsOpened: (b: boolean) => void,
    isLoading: boolean,
    setIsLoading: (l: boolean) => void,
    refreshTrigger: () => void,
    currentDir: string,
    uploadHandler: (file: File, selectedPath: string, onPercentChanged: Callback<number>) => Promise<void>,
}> = ({ isOpened, setIsOpened, isLoading, setIsLoading, refreshTrigger, currentDir, uploadHandler }) => {
    const [selectedFile, setSelectedFile] = useState(null as File | null)
    const [selectedPath, setSelectedPath] = useState('')
    const [isDragging, setIsDragging] = useState(false)
    const [progress, setProgress] = useState(0.0)
    const {userPrivateKey} = useAuthorization()
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const fileDropRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const filePath = '/' + splitByFirst(currentDir, '/_/')[1]
        if (!selectedFile){
            setSelectedPath(filePath)
            return
        }

        setSelectedPath(`${filePath}${selectedFile.name}`)
    }, [currentDir, selectedFile]);

    useEffect(() => {
        if (!isOpened){
            setSelectedFile(null)
        }

        setProgress(0.0)
    }, [isOpened]);

    const handlePathChanged = (e: ChangeEvent<HTMLInputElement>) => {
        const {value} = e.target
        setSelectedPath(value)
    }

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault()
        if (e.target.files) {
            const fileList = Array.from(e.target.files)
            if (fileList.length > 0){
                setSelectedFile(fileList[0])
            } else {
                setSelectedFile(null)
            }
        }
    }

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
        const fileList = Array.from(e.dataTransfer.files)
        if (fileList.length > 0){
            setSelectedFile(fileList[0])
        } else {
            setSelectedFile(null)
        }
    }

    const handleDragOver = (e: SyntheticEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const onUpload = async () => {
        setIsLoading(true)
        setProgress(0.0)
        let hasError = false;
        if (!selectedFile){
            toast.error("No file was selected")
            return
        }
        try {
            await uploadHandler(selectedFile, selectedPath, setProgress)
        } catch (e){
            if (axios.isAxiosError(e) && e.status === 409){
                toast.error('Listing with the same path already exists')
            } else {
                notifyApiError(e)
            }

            hasError = true
        } finally {
            setIsLoading(false)
        }

        if (!hasError) {
            refreshTrigger()
            setIsOpened(false)
        }
    }

    return isDesktop ? <Dialog open={isOpened} onOpenChange={setIsOpened}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Upload attachment</DialogTitle>
                <DialogDescription>
                    { userPrivateKey
                        ? "Upload an attachment to the folder specified bellow. The listed folder does not have to exist yet."
                        : "Unlock this session to continue"}
                </DialogDescription>
            </DialogHeader>
            <div className={"w-full flex flex-col gap-2"}>
                { !userPrivateKey
                    ? <PrivateKeyDecryptor isLoading={isLoading} setIsLoading={setIsLoading}/>
                    : <>
                        <div className="flex flex-row gap-2">
                            <Label className="w-32">File path:</Label>
                            <Input
                                className="flex-1 border-foreground"
                                id="selectedPath"
                                value={selectedPath}
                                onChange={handlePathChanged}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <Card
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={cn(
                                'p-6 border-2 border-dashed rounded-2xl text-center transition-colors',
                                isDragging ? 'drop-zone' : 'border-muted'
                            )}
                        >
                            <p className="mb-2">Drag files here or click to upload</p>
                            <Input
                                type="file"
                                onChange={handleFileChange}
                                className="hidden"
                                id="fileInput"
                            />

                            <label
                                htmlFor="fileInput"
                                className="cursor-pointer text-blue-600 underline"
                            >
                                Browse files
                            </label>
                        </Card>
                        <div className="relative w-full">
                            <Button disabled={isLoading || !selectedFile} onClick={onUpload} className={cn('w-full flex flex-grow border-foreground border-2 cursor-pointer',
                                isLoading ? '' : 'hover:bg-foreground hover:text-background')}>
                                { isLoading && <span
                                    className={'absolute left-0 top-0 h-full bg-foreground opacity-50 transition-all duration-300 rounded-md'}
                                    style={{ width: `${progress}%` }}
                                /> }
                                { isLoading && <Spinner/> }
                                Upload
                            </Button>
                        </div>
                    </>}
            </div>
        </DialogContent>
    </Dialog> : <Drawer open={isOpened} onOpenChange={setIsOpened}>
        <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>Upload attachment</DrawerTitle>
                <DrawerDescription>
                    { userPrivateKey
                        ? "Upload an attachment to the folder specified bellow. The listed folder does not have to exist yet."
                        : "Unlock this session to continue"}
                </DrawerDescription>
            </DrawerHeader>
            <div className={'w-full pb-3 px-3'}>
                { !userPrivateKey
                    ? <PrivateKeyDecryptor isLoading={isLoading} setIsLoading={setIsLoading}/>
                    : <div className={"w-full flex flex-col gap-2"}>
                        <div className="flex flex-row gap-2">
                            <Label className="w-32">File path:</Label>
                            <Input
                                className="flex-1 border-foreground"
                                id="selectedPath"
                                value={selectedPath}
                                onChange={handlePathChanged}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <Card
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={cn(
                                'p-6 border-2 border-dashed rounded-2xl text-center transition-colors',
                                isDragging ? 'drop-zone' : 'border-muted'
                            )}
                            onClick={() => {
                                if (fileDropRef.current){
                                    fileDropRef.current.click()
                                }
                            }}
                        >
                            <p>Tap to select file</p>
                            <Input
                                type="file"
                                onChange={handleFileChange}
                                id="fileInput"
                                className="hidden"
                                ref={fileDropRef}
                            />
                        </Card>
                        <div className="relative w-full">
                            <Button disabled={isLoading || !selectedFile} onClick={onUpload} className={cn('w-full flex flex-grow border-foreground border-2 cursor-pointer',
                                isLoading ? '' : 'hover:bg-foreground hover:text-background')}>
                                { isLoading && <span
                                    className={'absolute left-0 top-0 h-full bg-foreground opacity-50 transition-all duration-300 rounded-md'}
                                    style={{ width: `${progress}%` }}
                                /> }
                                <Spinner className={isLoading ? '' : 'hidden'}/>
                                Upload
                            </Button>
                        </div>
                        <Progress value={progress} />
                    </div> }
            </div>
        </DrawerContent>
    </Drawer>
}

export default AttachmentUploadDialog;
