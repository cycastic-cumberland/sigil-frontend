import type {PartitionPermission} from "@/dto/Permissions.ts";

export type PartitionUserDto = {
    email: string
    firstName: string
    lastName: string
    permissions: PartitionPermission[],
}
