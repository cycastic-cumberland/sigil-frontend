import {createContext, type FC, type ReactNode, useContext, useEffect, useMemo, useRef, useState} from "react";
import Pusher from "pusher-js";
import {getAuth} from "@/utils/auth.ts";
import api, {BACKEND_AUTHORITY} from "@/api.ts";
import type {CountDto} from "@/dto/CountDto.ts";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {formatQueryParameters} from "@/utils/format.ts";
import type {NotificationsDto} from "@/dto/notification/NotificationsDto.ts";
import type {NotificationDto} from "@/dto/notification/NotificationDto.ts";
import type {ChannelAuthorizationData} from "pusher-js/types/src/core/auth/options";

export type GetNotificationsRequest = {
    amount: number,
    lower: boolean,
    useNotificationFilter: boolean,
    sinceId?: number,
    isRead?: boolean
}

export type RegisterNotificationCallbackRequest = {
    notificationToken: `${string}-${string}-${string}-${string}-${string}`,
    eventName: string,
    callback: (() => void) | ((data: unknown) => void)
}

export type NotificationContextType = {
    notificationCount: number,
    newNotificationGuard: number,
    getNotifications: (request: GetNotificationsRequest) => Promise<NotificationDto[]>,
    markAsRead: (notificationIds: number[]) => Promise<void>,
    registerNotificationCallback: (request: RegisterNotificationCallbackRequest) => (() => void)
}

const PUSHER_APP_KEY = import.meta.env.VITE_PUSHER_APP_KEY as string | undefined
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER as string | undefined

const NotificationContext = createContext(null as never as NotificationContextType)

export const useNotification = () => {
    return useContext(NotificationContext)
}

export const NotificationProvider: FC<{ children?: ReactNode }> = ({ children }) => {
    const {authData} = useAuthorization()
    const [pusher, setPusher] = useState(null as Pusher | null)
    const boundCallbacks = useRef([] as (RegisterNotificationCallbackRequest & {destruct: () => void})[])
    const [isLoading, setIsLoading] = useState(false)
    const [notificationCount, setNotificationCount] = useState(0)
    const [newNotificationGuard, setNewNotificationGuard] = useState(0)
    const pusherTerminationTrigger = useMemo(() => !authData, [authData])

    useEffect(() => {
        return setUpPusher()
    }, [pusherTerminationTrigger]);

    useEffect(() => {
        pollItems().then(undefined)
    }, [authData, newNotificationGuard]);

    const pollItems = async () => {
        if (isLoading){
            setTimeout(() => pollItems(), 200)
            return
        }

        const auth = getAuth()
        if (!auth || !auth.notificationToken){
            return undefined
        }

        setIsLoading(true)
        try {
            const response = await api.get(`notifications/unread-count?useNotificationFilter=true`)
            setNotificationCount((response.data as CountDto).count)
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    const registerNotificationCallback = (request: RegisterNotificationCallbackRequest, pusherInstance?: Pusher): (() => void) => {
        if (!pusherInstance && pusher){
            pusherInstance = pusher
        }
        if (!pusherInstance){
            throw Error("No notification settings found")
        }

        const channel = pusherInstance.subscribe(`private-${request.notificationToken}`)
        channel.bind(request.eventName, request.callback)

        const destruct = () => {
            const requests = boundCallbacks.current.filter(p => p !== request)
            if (boundCallbacks.current.length === requests.length){
                return
            }

            channel.unbind(request.eventName, request.callback)
            pusherInstance.unsubscribe(request.notificationToken)
        }

        boundCallbacks.current = [...boundCallbacks.current, {...request, destruct}]
        return destruct
    }

    const authorizeChannel = async (channelName: string, socketId: string) =>{
        const response = await api.post('notifications/pusher/auth', {
            channelName,
            socketId
        })

        return response.data as ChannelAuthorizationData
    }

    const setUpPusher = (): (() => void) | undefined => {
        const auth = getAuth()

        if (!(PUSHER_APP_KEY && PUSHER_CLUSTER)){
            console.warn("No notification settings found")
            return undefined
        }

        if (!auth || !auth.notificationToken){
            return undefined
        }

        const pusher = new Pusher(PUSHER_APP_KEY, {
            cluster: PUSHER_CLUSTER,
            channelAuthorization: {
                transport: 'ajax',
                endpoint: BACKEND_AUTHORITY + '/api/notifications/pusher/auth',
                customHandler: (params, callback) => {
                    authorizeChannel(params.channelName, params.socketId)
                        .then(data => callback(null, data))
                        .catch(e => callback(e, null))
                }
            },
        });

        setPusher(pusher)
        const mainNotificationCb = registerNotificationCallback({
            notificationToken: auth.notificationToken,
            eventName: 'NEW_NOTIFICATION',
            callback: () => setNewNotificationGuard(c => c + 1)
        }, pusher)

        return () => {
            mainNotificationCb()
            pusher.disconnect()
        }
    }

    const getNotifications = async (request: GetNotificationsRequest) => {
        const response = await api.get(formatQueryParameters('notifications', request))
        const data = response.data as NotificationsDto
        return data.notifications
    }

    const markAsRead = async (notificationIds: number[]) => {
        await api.post('notifications',{
            notificationIds
        })
    }

    const value: NotificationContextType = {
        notificationCount,
        newNotificationGuard,
        getNotifications,
        markAsRead,
        registerNotificationCallback,
    }

    return <NotificationContext.Provider value={value}>
        {children}
    </NotificationContext.Provider>
}