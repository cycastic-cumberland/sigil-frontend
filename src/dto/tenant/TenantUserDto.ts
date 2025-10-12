import type {TenantPermission} from "@/dto/Permissions.ts";
import type {TenantMembership} from "@/dto/tenant/TenantDto.ts";
import type {ExtendedMemberDto} from "@/dto/MemberDto.ts";

export type TenantUserDto = ExtendedMemberDto<TenantPermission> & {
    membership: TenantMembership,
}