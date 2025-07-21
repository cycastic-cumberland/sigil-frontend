export type AttachmentPresignedDto = {
    id: number,
    url: string
    multipartId?: string,
    chunkSize: number,
}