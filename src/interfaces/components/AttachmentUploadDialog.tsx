import {
    type ChangeEvent,
    type DragEvent,
    type FC,
    type RefObject,
    type SyntheticEvent,
    useEffect, useMemo,
    useRef,
    useState
} from "react";
import axios, {type AxiosProgressEvent} from "axios";
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
import {toast} from "sonner";
import type {PartitionDto} from "@/dto/PartitionDto.ts";
import {createApi} from "@/api.ts";
import {base64ToUint8Array, decryptWithPrivateKey, digestMd5, uint8ArrayToBase64} from "@/utils/cryptography.ts";
import {splitByFirst} from "@/utils/path.ts";
import {notifyApiError} from "@/utils/errors.ts";
import {useServerCommunication} from "@/contexts/ServerCommunicationContext.tsx";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {PrivateKeyDecryptor} from "@/interfaces/components/PrivateKeyDecryptor.tsx";

const splitFile = (file: File, partSize: number) => {
    const parts: Blob[] = [];
    let start = 0;
    while (start < file.size) {
        const end = Math.min(start + partSize, file.size);
        parts.push(file.slice(start, end));
        start = end;
    }
    return parts;
}

const AttachmentUploadDialog: FC<{
    isOpened: boolean,
    setIsOpened: (b: boolean) => void,
    isLoading: boolean,
    setIsLoading: (l: boolean) => void,
    refreshTrigger: () => void,
    currentDir: string,
    partitionRef: RefObject<PartitionDto | null>,
}> = ({ isOpened, setIsOpened, isLoading, setIsLoading, refreshTrigger, currentDir, partitionRef }) => {
    const [selectedFile, setSelectedFile] = useState(null as File | null)
    const [selectedPath, setSelectedPath] = useState('')
    const [isDragging, setIsDragging] = useState(false)
    const [totalFileSize, setTotalFileSize] = useState(0.0)
    const [uploadedFileSize, setUploadedFileSize] = useState(0.0)
    const progress = useMemo(() => {
        const total = totalFileSize <= 0.0 ? 1.0 : totalFileSize
        const percent = (uploadedFileSize * 100.0) / total
        return percent > 100.0 ? 10.0 : percent
    }, [totalFileSize, uploadedFileSize])
    const {userPrivateKey} = useAuthorization()
    const partitionKeyRef = useRef(null as Uint8Array | null)
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const fileDropRef = useRef<HTMLInputElement>(null)
    const partitionIdRef = useRef(null as number | null)
    const api = createApi(partitionIdRef)
    const {wrapSecret} = useServerCommunication()

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

        setTotalFileSize(0.0)
        setUploadedFileSize(0.0)
    }, [isOpened]);

    const handlePathChanged = (e: ChangeEvent<HTMLInputElement>) => {
        const {value} = e.target
        setSelectedPath(value)
    }

    const getPartitionKey = async () => {
        const userKey = userPrivateKey!
        const decryptedPartitionKey = await decryptWithPrivateKey(userKey, base64ToUint8Array(partitionRef.current!.userPartitionKey.cipher))
        partitionKeyRef.current = decryptedPartitionKey
        return decryptedPartitionKey
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
        const loaded = progressEvent.loaded
        setUploadedFileSize(c => c + loaded);
    }

    const uploadPresignedPart = async <T extends number | null> (url: string, partitionKeyMd5Base64: string, partitionKeyBase64: string, file: Blob, part: T) => {
        const response = await axios.put(url, file, {
            headers: {
                'content-type': 'application/octet-stream',
                'x-amz-server-side-encryption-customer-algorithm': 'AES256',
                'x-amz-server-side-encryption-customer-key-md5': partitionKeyMd5Base64,
                'x-amz-server-side-encryption-customer-key': partitionKeyBase64,
            },

            onUploadProgress: uploadEvent
        })

        return {
            part,
            etag: response.headers.etag as string
        }
    }

    const uploadPresigned = async () => {
        const file = selectedFile;
        if (!file){
            throw Error("unreachable")
        }

        setTotalFileSize(file.size)
        partitionIdRef.current = partitionRef.current?.id ?? null

        const partitionKey = await getPartitionKey()
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
            if (!presigned.multipartId){
              await uploadPresignedPart(presigned.url, partitionKeyMd5Base64, partitionKeyBase64, file, null)
               await api.post('listings/attachment/complete', {
                   id: presigned.id
               })
            } else {
               const split = splitFile(file, presigned.chunkSize)
               const firstUpload = uploadPresignedPart(presigned.url, partitionKeyMd5Base64, partitionKeyBase64, split[0], 1)
               const promises = split.slice(1).map((b, i) => {
                   return (async () => {
                       const partNumber = i + 2
                       const response = await api.post("listings/attachment/presigned/multipart", {
                           id: presigned.id,
                           uploadId: presigned.multipartId,
                           partNumber,
                           keyMd5: partitionKeyMd5Base64
                       })

                       const partPresigned = response.data as AttachmentPresignedDto
                       return await uploadPresignedPart(partPresigned.url, partitionKeyMd5Base64, partitionKeyBase64, b, partNumber)
                   })()
               })

               promises.push(firstUpload)
               const result = await Promise.all(promises)
                await api.post('listings/attachment/complete', {
                    id: presigned.id,
                    uploadId: presigned.multipartId,
                    multipartUploadResult: result,
                })
            }
            setIsOpened(false)
            toast.success("Attachment uploaded")
        } catch (e){
            await api.delete(`attachment?id=${encodeURIComponent(presigned.id)}`).catch(() => {})
            throw e
        }
    }

    const directUpload = async () => {
        const file = selectedFile;
        if (!file){
            throw Error("unreachable")
        }

        setTotalFileSize(file.size)
        partitionIdRef.current = partitionRef.current?.id ?? null

        const partitionKey = await getPartitionKey()
        const partitionKeyBase64 = uint8ArrayToBase64(partitionKey)

        const encryptedPartitionKey = await wrapSecret(Uint8Array.from(partitionKeyBase64.split("").map(x => x.charCodeAt(0))))
        const data = new FormData();
        data.append("file", file)
        await api.post(`listings/attachment?listingPath=${selectedPath}`, data, {
            headers: {
                'content-type': 'multipart/form-data',
                'x-encryption-key': encryptedPartitionKey
            },

            onUploadProgress: uploadEvent
        })
    }

    const onUpload = async () => {
        setIsLoading(true)
        setTotalFileSize(0.0)
        setUploadedFileSize(0.0)
        let hasError = false;
        try {
            if (partitionRef.current!.serverSideKeyDerivation){
                await directUpload()
            } else {
                await uploadPresigned()
            }
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
