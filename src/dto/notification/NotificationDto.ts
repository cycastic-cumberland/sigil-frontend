import type {CipherDto} from "@/dto/cryptography/CipherDto.ts";

export type NotificationDto = {
    id: number,
    userId: number,
    read: boolean,
    notificationContent: string,
    notificationType: string,
    encryptionCipher: CipherDto,
    createdAt: string,
}

export type StandardNotificationContent = {
    title: string,
    message: string
}

export type LinkNotificationContent = StandardNotificationContent & {
    link: string
}
