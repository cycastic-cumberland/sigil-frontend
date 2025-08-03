import type {TenantPermission} from "@/dto/Permissions.ts";
import type {TenantMembership} from "@/dto/TenantDto.ts";

export type TenantUserDto = {
    email: string,
    firstName: string,
    lastName: string,
    membership: TenantMembership,
    permissions: TenantPermission[],
}