import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from "@/components/ui/pagination.tsx";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar.tsx";
import {formatQueryParameters} from "@/utils/format.ts";
import {type FC, type HTMLAttributes, type RefObject, useEffect, useMemo, useRef, useState} from "react";
import {cn} from "@/lib/utils.ts";
import type {TaskCommentDto} from "@/dto/pm/TaskCommentDto.ts";
import {formatDistanceToNow} from "date-fns";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {MinimalTiptap} from "@/components/ui/shadcn-io/minimal-tiptap";
import {Button} from "@/components/ui/button.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {createApi} from "@/api.ts";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import type {PageDto} from "@/dto/PageDto.ts";
import {notifyApiError} from "@/utils/errors.ts";
import {toast} from "sonner";
import {type Editor, EditorContent, useEditor} from "@tiptap/react";
import {
    base64ToUint8Array,
    digestSha256,
    encryptAESGCM,
    tryDecryptText,
    uint8ArrayToBase64
} from "@/utils/cryptography.ts";
import type {CipherDto} from "@/dto/cryptography/CipherDto.ts";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import StarterKit from "@tiptap/starter-kit";
import type {Callback} from "@/utils/misc.ts";
import {useConsent} from "@/contexts/ConsentContext.tsx";
import {getAvatarSource} from "@/utils/path.ts";

const tenantApi = createApi(null)

const TaskCommentCardContent: FC<{
    decryptedComment: string
}> = ({decryptedComment}) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
            }),
        ],
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base lg:prose-lg',
            },
        },
        editable: false,
        content: decryptedComment
    })

    return <EditorContent editor={editor}/>
}

const TaskCommentInput: FC<{
    editorRef: RefObject<Editor | null>,
    onBlur: () => void,
    comment: string,
    onChange: Callback<string>,
    onSubmit: () => void,
    onDelete?: () => void,
}> = ({editorRef, onBlur, comment, onChange, onSubmit, onDelete}) => {
    return <>
        <MinimalTiptap editorRef={editorRef}
                       onBlur={onBlur}
                       onSubmit={onSubmit}
                       content={comment}
                       onChange={onChange}/>
        <Button onClick={onSubmit} className={'hover:text-background hover:bg-foreground cursor-pointer bg-background text-foreground border-2 border-foreground shadow-none"'}>
            Submit
        </Button>
        {onDelete && <Button onClick={onDelete} variant={'destructive'} className={'cursor-pointer'}>
            Delete
        </Button>}
    </>
}

const TaskCommentCard: FC<{
    comment: TaskCommentDto,
    partitionKey: CryptoKey,
    onCommentSubmitted: () => void,
    onCommentDeleted: () => void,
}> = ({comment, partitionKey, onCommentSubmitted, onCommentDeleted}) => {
    const editorRef = useRef(null as Editor | null)
    const deleteRef = useRef(null as Promise<boolean> | null)
    const {id, taskIdentifier, sender, encryptedContent, createdAt, updatedAt} = comment
    const {requireAgreement} = useConsent()
    const [manualLoading, setManualLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [decryptedComment, setDecryptedComment] = useState('')
    const [writingComment, setWritingComment] = useState('')
    const isUnsaved = useMemo(() => writingComment !== decryptedComment, [writingComment, decryptedComment])
    const updatedMessage = useMemo(() => updatedAt ? `updated ${formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}` : '', [updatedAt])
    const unsavedMessage = useMemo(() => isUnsaved ? 'Unsaved comment' : '', [isUnsaved])
    const isLoading = useMemo(() => manualLoading || !decryptedComment, [manualLoading, decryptedComment])
    const additionalContext = useMemo(() => {
        const context = [] as string[]
        if (updatedMessage){
            context.push(updatedMessage)
        }
        if (unsavedMessage){
            context.push(unsavedMessage)
        }
        return context
    }, [updatedMessage, unsavedMessage])

    const decryptComment = async () => {
        try {
            return await tryDecryptText(partitionKey,
                encryptedContent.cipher,
                base64ToUint8Array(encryptedContent.iv!))
        } catch (e){
            notifyApiError(e)
            return ''
        }
    }

    const onSave = async () => {
        if (!isUnsaved){
            setIsEditing(false)
            return
        }

        try {
            setManualLoading(true)

            const encoder = new TextEncoder()
            const encryptedContent = await encryptAESGCM({
                content: encoder.encode(writingComment),
                key: partitionKey
            })
            const partitionChecksum = uint8ArrayToBase64(await digestSha256(new Uint8Array(await crypto.subtle.exportKey("raw", partitionKey))))
            await tenantApi.post('pm/tasks/comments', {
                id,
                partitionChecksum,
                taskId: taskIdentifier,
                encryptedContent: {
                    decryptionMethod: 'UNWRAPPED_PARTITION_KEY',
                    iv: uint8ArrayToBase64(encryptedContent.iv),
                    cipher: uint8ArrayToBase64(encryptedContent.cipherText)
                } as CipherDto
            })

            toast.success("Comment updated")
            setIsEditing(false)
            onCommentSubmitted()
        } catch (e){
            notifyApiError(e)
        } finally {
            setManualLoading(false)
        }
    }

    const onDelete = async () => {
        if (!await requireAgreement({
            title: "Delete comment",
            message: "Do you want to delete this comment?",
            acceptText: "Delete",
            ref: deleteRef,
            destructive: true,
        })){
            return
        }

        try {
            setManualLoading(true)

            await tenantApi.delete(formatQueryParameters('pm/tasks/comments',{
                id,
                taskId: taskIdentifier
            }))

            toast.success("Comment deleted")
            setIsEditing(false)
            onCommentDeleted()
        } catch (e){
            notifyApiError(e)
        } finally {
            setManualLoading(false)
        }
    }

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isUnsaved) {
                e.preventDefault()
            }
        }

        window.addEventListener("beforeunload", handleBeforeUnload)
        return () => window.removeEventListener("beforeunload", handleBeforeUnload)
    }, [isUnsaved]);

    useEffect(() => {
        decryptComment().then(setDecryptedComment)
    }, [comment]);

    useEffect(() => {
        setWritingComment(decryptedComment)
    }, [decryptedComment]);

    useEffect(() => {
        if (isEditing){
            editorRef.current?.commands.focus('end')
        }
    }, [isEditing]);

    return <div className={'flex items-start gap-4'}>
        <Avatar className={"h-10 w-10 shrink-0"}>
            <AvatarImage src={getAvatarSource(sender.avatarToken, 100)} />
            <AvatarFallback>
                {sender.firstName[0]}{sender.lastName[0]}
            </AvatarFallback>
        </Avatar>
        <div className={'grid gap-1.5 w-full'}>
            <div className={'flex items-center gap-2'}>
                <Tooltip>
                    <TooltipTrigger>
                        <div className={'pl-2 font-medium'}>
                            {sender.firstName} {sender.lastName}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        Sender: {sender.email}
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger>
                        <div className={'text-xs text-muted-foreground'}>
                            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                            {additionalContext.length ? ' (' + additionalContext.join(' • ') + ')' : undefined}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        {updatedAt ? 'Last updated' : 'Created'} at {new Date(updatedAt ?? createdAt).toString()}
                    </TooltipContent>
                </Tooltip>
            </div>
            {!isLoading && writingComment && !isEditing && <div className={cn('cursor-pointer duration-150 w-full rounded-xl', isUnsaved ? 'border-muted-foreground border-2 hover:border-foreground' : 'border-1 border-transparent hover:border-muted-foreground')}
                                      onClick={() => setIsEditing(true)}>
                <div className={'w-full px-2 py-1'}>
                    <TaskCommentCardContent decryptedComment={writingComment}/>
                </div>
            </div>}
            {!isLoading && writingComment && isEditing &&
                <TaskCommentInput editorRef={editorRef}
                                  onBlur={() => setIsEditing(false)}
                                  comment={writingComment}
                                  onChange={setWritingComment}
                                  onSubmit={onSave}
                                  onDelete={onDelete}/>}
            {isLoading && <>
                <Skeleton className={'w-full h-4'}/>
                <Skeleton className={'w-1/3 h-4'}/>
            </>}
        </div>
    </div>
}

const TaskCommentsList: FC<HTMLAttributes<HTMLDivElement> & {
    taskId: string,
    partitionKey: CryptoKey,
    onCommentSubmitted?: () => void,
}> = ({taskId, partitionKey, onCommentSubmitted, className, ...props}) => {
    const [areCommentsLoading, setAreCommentsLoading] = useState(false)
    const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
    const [isCommenting, setIsCommenting] = useState(false)
    const [writingComment, setWritingComment] = useState('')
    const [comments, setComments] = useState([] as TaskCommentDto[])
    const [page, setPage] = useState(1)
    const editorRef = useRef(null as Editor | null)
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
    const isUnsaved = useMemo(() => writingComment && writingComment !== '<p></p>', [writingComment])

    const loadComments = async (page: number) => {
        try {
            setAreCommentsLoading(true)
            const response = await tenantApi.get(formatQueryParameters('pm/tasks/comments', {
                taskId,
                page,
                pageSize: 10
            }))
            const {totalPages, items} = response.data as PageDto<TaskCommentDto>
            setTotalPage(totalPages <= 0 ? 1 : totalPages)
            setComments(items)
        } catch (e) {
            notifyApiError(e)
        } finally {
            setAreCommentsLoading(false)
        }
    }

    const submitComment = async () => {
        if (!isUnsaved){
            editorRef.current?.commands.focus('end')
            return
        }

        try {
            setIsCommentSubmitting(true)

            const encoder = new TextEncoder()
            const encryptedContent = await encryptAESGCM({
                content: encoder.encode(writingComment),
                key: partitionKey
            })
            const partitionChecksum = uint8ArrayToBase64(await digestSha256(new Uint8Array(await crypto.subtle.exportKey("raw", partitionKey))))
            await tenantApi.post('pm/tasks/comments', {
                partitionChecksum,
                taskId,
                encryptedContent: {
                    decryptionMethod: 'UNWRAPPED_PARTITION_KEY',
                    iv: uint8ArrayToBase64(encryptedContent.iv),
                    cipher: uint8ArrayToBase64(encryptedContent.cipherText)
                } as CipherDto
            })

            toast.success("Comment submitted")
            setIsCommenting(false)
            setWritingComment('')
            loadComments(page).then(undefined)
            if (onCommentSubmitted){
                onCommentSubmitted()
            }
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsCommentSubmitting(false)
        }
    }

    useEffect(() => {
        loadComments(page).then(undefined)
    }, [page]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isUnsaved) {
                e.preventDefault()
            }
        }

        window.addEventListener("beforeunload", handleBeforeUnload)
        return () => window.removeEventListener("beforeunload", handleBeforeUnload)
    }, [isUnsaved]);

    useEffect(() => {
        if (isCommenting){
            editorRef.current?.commands.focus('end')
        }
    }, [isCommenting]);

    return <div className={cn('flex flex-col w-full gap-4', className)} {...props}>
        <div className={'w-full flex flex-col gap-2'}>
            {isCommenting && !isCommentSubmitting
                ? <TaskCommentInput editorRef={editorRef} onBlur={() => setIsCommenting(false)} comment={writingComment} onChange={setWritingComment} onSubmit={submitComment}/>
                : <div onClick={() => setIsCommenting(true)}>
                    <Textarea className={'resize-none cursor-pointer'} placeholder={isUnsaved ? 'You have unsaved comment' : 'Comment on this task…'}/>
                </div>}
            {isCommentSubmitting && <div className={'w-full h-24 flex flex-col justify-center'}>
                <FullSizeSpinner/>
            </div>}
        </div>
        {areCommentsLoading && <div className={'w-full h-24 flex flex-col justify-center'}>
            <FullSizeSpinner/>
        </div>}
        {!areCommentsLoading && <div className={'space-y-6'}>
            {comments.map((c, i) => <TaskCommentCard key={i}
                                                     comment={c}
                                                     partitionKey={partitionKey}
                                                     onCommentSubmitted={() => loadComments(page)}
                                                     onCommentDeleted={() => {
                                                         loadComments(page).then(undefined)
                                                         if (onCommentSubmitted){
                                                             onCommentSubmitted()
                                                        }
                                                     }}/>)}
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
}

export default TaskCommentsList