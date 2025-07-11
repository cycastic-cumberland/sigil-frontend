import type {CipherDto} from "@/dto/CipherDto.ts";

export type UploadPartitionDto = {
    id?: number,
    partitionPath: string,
    serverSideKeyDerivation: boolean,
}

export type PartitionDto = {
    id: number,
    partitionPath: string,
    userPartitionKey: CipherDto,
    serverSideKeyDerivation: boolean,
    createdAt: string,
    updatedAt: string,
}