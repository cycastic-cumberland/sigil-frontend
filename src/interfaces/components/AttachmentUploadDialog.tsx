import {type ChangeEvent, type DragEvent, type FC, type SyntheticEvent, useEffect, useRef, useState} from "react";
import axios, {type AxiosError, type AxiosProgressEvent} from "axios";
import api from "@/api.tsx";
import type {AttachmentPresignedDto} from "@/dto/AttachmentPresignedDto.ts";
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

const AttachmentUploadDialog: FC<{
    isOpened: boolean,
    setIsOpened: (b: boolean) => void,
    isLoading: boolean,
    setIsLoading: (l: boolean) => void,
    refreshTrigger: () => void,
    currentDir: string,
}> = ({ isOpened, setIsOpened, isLoading, setIsLoading, refreshTrigger, currentDir }) => {
    const [selectedFile, setSelectedFile] = useState(null as File | null)
    const [selectedPath, setSelectedPath] = useState('')
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState('')
    const [progress, setProgress] = useState(0.0)
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const fileDropRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!selectedFile){
            setSelectedPath(currentDir)
            return
        }

        setSelectedPath(`${currentDir}${selectedFile.name}`)
    }, [currentDir, selectedFile]);

    useEffect(() => {
        if (!isOpened){
            setSelectedFile(null)
        }

        setProgress(0.0)
        setError('')
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

    const uploadEvent = (progressEvent: AxiosProgressEvent) => {
        const total = progressEvent.total ?? 1;
        let percentCompleted = Math.round((progressEvent.loaded * 100) / total);
        percentCompleted = percentCompleted > 100 ? 10 : percentCompleted;
        setProgress(percentCompleted);
    }

    const uploadPresigned = async () => {
        const file = selectedFile;
        if (!file){
            throw Error("unreachable")
        }

        const presignedResponse = await api.post('listings/attachment', {
            path: selectedPath,
            mimeType: file.type
        })
        const presigned = presignedResponse.data as AttachmentPresignedDto;

        try {
            await axios.put(presigned.url, file, {
                headers: {
                    'Content-Type': 'application/octet-stream'
                },

                onUploadProgress: uploadEvent
            })
            await api.post('listings/attachment/complete', {
                id: presigned.id
            })
            setIsOpened(false)
        } catch (e){
            await api.delete(`attachment?id=${encodeURIComponent(presigned.id)}`).catch(() => {})
            throw e
        }
    }

    const onUpload = async () => {
        setIsLoading(true)
        setError('')
        setProgress(0.0)
        let hasError = false;
        try {
            await uploadPresigned()
        } catch (e){
            const ae = e as AxiosError;
            if (ae.status === 409){
                setError('Listing with the same name already exists')
            } else {
                // @ts-ignore
                setError(ae.response?.data?.message ?? "")
            }

            hasError = true
        } finally {
            setIsLoading(false)
        }

        if (!hasError) {
            refreshTrigger()
        }
    }

    return isDesktop ? <Dialog open={isOpened} onOpenChange={setIsOpened}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Upload attachment</DialogTitle>
                <DialogDescription>
                    Upload an attachment to the folder specified bellow. The listed folder does not have to exist yet.
                </DialogDescription>
            </DialogHeader>
            <div className={"w-full flex flex-col gap-2"}>
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
                        error ? 'bg-destructive' : '',
                        isLoading ? '' : 'hover:bg-foreground hover:text-background')}>
                        { isLoading && <span
                            className={'absolute left-0 top-0 h-full bg-foreground opacity-50 transition-all duration-300 rounded-md'}
                            style={{ width: `${progress}%` }}
                        /> }
                        <Spinner className={isLoading ? '' : 'hidden'}/>
                        { error ? error : 'Upload' }
                    </Button>
                </div>
                <Progress value={progress} />
            </div>
        </DialogContent>
    </Dialog> : <Drawer open={isOpened} onOpenChange={setIsOpened}>
        <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>Upload attachment</DrawerTitle>
                <DrawerDescription>
                    Upload an attachment to the folder specified bellow. The listed folder does not have to exist yet.
                </DrawerDescription>
            </DrawerHeader>
            <div className={'w-full pb-3 px-3'}>
                <div className={"w-full flex flex-col gap-2"}>
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
                    <Button disabled={isLoading || !selectedFile} onClick={onUpload} className={`flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background ${error ? 'bg-destructive' : ''}`}>
                        { error ? error : 'Upload' }
                    </Button>
                    <Progress value={progress} />
                </div>
            </div>
        </DrawerContent>
    </Drawer>
}

export default AttachmentUploadDialog;
