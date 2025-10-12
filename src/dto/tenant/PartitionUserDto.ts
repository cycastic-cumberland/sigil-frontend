import type {PartitionPermission} from "@/dto/Permissions.ts";
import type {ExtendedMemberDto} from "@/dto/MemberDto.ts";

export type PartitionUserDto = ExtendedMemberDto<PartitionPermission>
