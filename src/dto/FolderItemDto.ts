export type FolderItemType = "TEXT" | "DECIMAL" | "ATTACHMENT" | "FOLDER"

export type FolderItemDto = {
    name: string,
    type: FolderItemType,
    modifiedAt?: string
}
