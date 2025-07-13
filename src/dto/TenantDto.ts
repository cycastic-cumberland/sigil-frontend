import type {TenantPermission} from "@/dto/Permissions.ts";

export type TenantMembership = "OWNER" | "MODERATOR" | "MEMBER"

export type TenantDto = {
    id?: number
    tenantName: string
    membership: TenantMembership
    permissions: TenantPermission[]
    createdAt?: string
    updatedAt?: string
    removedAt?: string
}