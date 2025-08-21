import {useNotification} from "@/contexts/NotificationContext.tsx";
import {type FC, type HTMLAttributes, type SyntheticEvent, useEffect, useMemo, useRef, useState} from "react";
import type {
    LinkNotificationContent,
    NotificationDto,
    StandardNotificationContent
} from "@/dto/notification/NotificationDto.ts";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import {cn} from "@/lib/utils.ts";
import {notifyApiError} from "@/utils/errors.ts";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Link} from "react-router";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {base64ToUint8Array, decryptAESGCM, decryptWithPrivateKey} from "@/utils/cryptography.ts";

const SkeletonItem = () => {
    return <div className={'w-full flex flex-row gap-2'}>
        <Skeleton className={'w-6 h-6 rounded-full'}/>
        <Skeleton className={'w-full h-6'}/>
    </div>
}

const NotificationItem: FC<{
    notification: NotificationDto,
    userPrivateKey: CryptoKey
}> = ({notification, userPrivateKey}) => {
    const {markAsRead} = useNotification()
    const [mutatedNotification, setMutatedNotification] = useState({...notification})
    const [isLoading, setIsLoading] = useState(false)
    const [content, setContent] = useState(null as StandardNotificationContent | null)
    const contentLink = useMemo<LinkNotificationContent | null>(() => !content ? null : Object.keys(content).includes("link")
        ? content as LinkNotificationContent
        : null,
        [content])

    useEffect(() => {
        setMutatedNotification({...notification})
    }, [notification]);

    useEffect(() => {
        (async () => {
            setIsLoading(true)
            try {
                const notificationEncryptionKey = await decryptWithPrivateKey(userPrivateKey, base64ToUint8Array(mutatedNotification.encryptionCipher.cipher))
                const notificationContent = await decryptAESGCM(base64ToUint8Array(mutatedNotification.notificationContent),
                    base64ToUint8Array(mutatedNotification.encryptionCipher.iv!),
                    notificationEncryptionKey)
                const textDecoder = new TextDecoder();
                const text = textDecoder.decode(notificationContent)
                setContent(JSON.parse(text) as StandardNotificationContent)
            } finally {
                setIsLoading(false)
            }
        })()
    }, [mutatedNotification]);

    if (!content){
        return <></>
    }

    return <>
        <Button variant={'ghost'}
                className={'w-full cursor-pointer justify-start'}
                onClick={() => {
                    if (!mutatedNotification.read) {
                        setMutatedNotification(n => ({
                            ...n,
                            read: true
                        }))
                        markAsRead([mutatedNotification.id]).then(undefined)
                    }
                }}
                asChild>
            {isLoading
                ? <SkeletonItem/>
                : <Link to={contentLink ? contentLink.link : '#'}>
                    <h4 className={cn('leading-none font-medium', mutatedNotification.read ? '' : 'text-primary')}>{content.title}</h4>
                    <p className={'text-muted-foreground text-sm overflow-hidden text-ellipsis'}>
                        {content.message}
                    </p>
                </Link>}
        </Button>
        <div className="flex items-center mt-2">
            <hr className="flex-grow border-t border-muted-foreground"/>
        </div>
    </>
}

const NotificationList: FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
    const [isLoading, setIsLoading] = useState(false)
    const {getNotifications, newNotificationGuard} = useNotification()
    const notificationContainerRef = useRef<HTMLInputElement>(null)
    const [notifications, setNotifications] = useState([] as NotificationDto[])
    const {userPrivateKey} = useAuthorization()

    const onGetNotifications = async (isScrollDown?: boolean) => {
        setIsLoading(true)
        try {
            if (isScrollDown){
                const lower = await getNotifications({
                    amount: 5,
                    lower: true,
                    useNotificationFilter: true,
                    sinceId: notifications[notifications.length - 1].id
                })
                setNotifications([
                    ...notifications,
                    ...lower.reverse(),
                ])

                return
            } else {
                const response = await getNotifications({
                    amount: 100,
                    lower: true,
                    useNotificationFilter: true,
                })

                setNotifications(response.reverse())
            }
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    // @ts-ignore
    const onScroll = (e: SyntheticEvent) => {
        e.preventDefault()
        const container = notificationContainerRef.current
        if (!container){
            return
        }
        const scrollY = container.scrollHeight - container.scrollTop
        const height = container.offsetHeight
        const offset = height - scrollY

        if (offset === 0 || offset === 1) {
            onGetNotifications(true).then(undefined)
        }
    }

    useEffect(() => {
        onGetNotifications().then(undefined)
    }, [newNotificationGuard]);

    return <div className={cn('gap-2', className)} ref={notificationContainerRef} {...props}>
        {isLoading
            ? <SkeletonItem/>
            : notifications.length
                ? <>
                    {userPrivateKey
                        ? notifications.map(n => <NotificationItem key={n.id} notification={n} userPrivateKey={userPrivateKey}/>)
                        : <div className={"h-full w-full flex flex-row justify-center text-center"}>
                            <Label className={"text-muted-foreground"}>
                                Unlock session to view notifications
                            </Label>
                        </div>}
                </>
                : <div className={"h-full w-full flex flex-row justify-center text-center"}>
                    <Label className={"text-muted-foreground"}>
                        No notification
                    </Label>
                </div>}
    </div>
}

export default NotificationList