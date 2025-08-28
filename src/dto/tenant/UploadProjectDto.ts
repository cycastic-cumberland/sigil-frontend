import type {UploadPartitionDto} from "@/dto/tenant/PartitionDto.ts";

export type UploadProjectDto = UploadPartitionDto & {
    uniqueIdentifier: string
}