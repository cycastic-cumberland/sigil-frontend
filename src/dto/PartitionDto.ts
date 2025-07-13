import type {CipherDto} from "@/dto/CipherDto.ts";
import type {PartitionPermission} from "@/dto/Permissions.ts";

export type UploadPartitionDto = {
    id?: number,
    partitionPath: string,
    serverSideKeyDerivation: boolean,
}

export type PartitionDto = {
    id: number,
    partitionPath: string,
    userPartitionKey: CipherDto,
    permissions: PartitionPermission[],
    serverSideKeyDerivation: boolean,
    createdAt: string,
    updatedAt: string,
}