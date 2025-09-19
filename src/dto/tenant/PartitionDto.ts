import type {CipherDto} from "@/dto/cryptography/CipherDto.ts";
import type {PartitionPermission} from "@/dto/Permissions.ts";

export type UploadPartitionDto = {
    id?: number,
    partitionPath: string,
    serverSideKeyDerivation: boolean,
}

export type PartitionType = "GENERIC" | "PROJECT"

export type PartitionDto = {
    id: number,
    partitionPath: string,
    userPartitionKey: CipherDto,
    permissions: PartitionPermission[],
    serverSideKeyDerivation: boolean,
    partitionType: PartitionType,
    createdAt: string,
    updatedAt: string,
}

export type ProjectPartitionDto = PartitionDto & {
    uniqueIdentifier: string,
    latestSprintNumber: number,
    latestTaskId: number,
}

export const isProjectPartition = (p: PartitionDto): p is ProjectPartitionDto => {
    return "uniqueIdentifier" in p
}
