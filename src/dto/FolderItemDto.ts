export type FolderItemType = "TEXT" | "DECIMAL" | "ATTACHMENT" | "FOLDER" | "PARTITION" | "PROJECT_PARTITION"

export type FolderItemDto = {
    name: string,
    type: FolderItemType,
    modifiedAt?: string,
    attachmentUploadCompleted?: boolean
}
