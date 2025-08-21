import {createContext, type FC, type ReactNode, useContext, useEffect, useState} from "react";
import Pusher from "pusher-js";
import {getAuth} from "@/utils/auth.ts";
import api from "@/api.ts";
import type {CountDto} from "@/dto/CountDto.ts";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {formatQueryParameters} from "@/utils/format.ts";
import type {NotificationsDto} from "@/dto/notification/NotificationsDto.ts";
import type {NotificationDto} from "@/dto/notification/NotificationDto.ts";

export type GetNotificationsRequest = {
    amount: number,
    lower: boolean,
    useNotificationFilter: boolean,
    sinceId?: number,
    isRead?: boolean
}

export type NotificationContextType = {
    notificationCount: number,
    newNotificationGuard: number,
    getNotifications: (request: GetNotificationsRequest) => Promise<NotificationDto[]>,
    markAsRead: (notificationIds: number[]) => Promise<void>
}

const PUSHER_APP_KEY = import.meta.env.VITE_PUSHER_APP_KEY as string | undefined
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER as string | undefined

const NotificationContext = createContext(null as never as NotificationContextType)

export const useNotification = () => {
    return useContext(NotificationContext)
}

export const NotificationProvider: FC<{ children?: ReactNode }> = ({ children }) => {
    const {authData} = useAuthorization()
    const [isLoading, setIsLoading] = useState(false)
    const [notificationCount, setNotificationCount] = useState(0)
    const [newNotificationGuard, setNewNotificationGuard] = useState(0)

    useEffect(() => {
        return setUpPusher()
    }, [authData]);

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
            cluster: PUSHER_CLUSTER
        });

        // random UUID
        const channelName = auth.notificationToken
        const channel = pusher.subscribe(channelName)
        const eventName = 'NEW_NOTIFICATION'
        const callback = () => setNewNotificationGuard(c => c + 1)
        channel.bind(eventName, callback)

        return () => {
            channel.unbind(eventName, callback);
            pusher.unsubscribe(channelName);
            pusher.disconnect();
        };
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
    }

    return <NotificationContext.Provider value={value}>
        {children}
    </NotificationContext.Provider>
}