export type TenantPermission = "MEMBER" | "CREATE_PARTITIONS" | "DELETE_PARTITIONS" | "MODERATE" | "LIST_USERS"

export type PartitionPermission = "READ" | "WRITE" | "MODERATE"

const HUMAN_READABLE_TENANT_PERMISSION_MAP: Record<TenantPermission, string> = {
    "MEMBER": "Member",
    "CREATE_PARTITIONS": "Create partitions",
    "DELETE_PARTITIONS": "Delete partitions",
    "MODERATE": "Moderate",
    "LIST_USERS": "List users",
}

export const ALL_TENANT_PERMISSIONS = Object.keys(HUMAN_READABLE_TENANT_PERMISSION_MAP) as TenantPermission[]


const HUMAN_READABLE_PARTITION_PERMISSION_MAP: Record<PartitionPermission, string> = {
    "READ": "Read",
    "WRITE": "Write",
    "MODERATE": "Moderate"
}

export const ALL_PARTITION_PERMISSIONS = Object.keys(HUMAN_READABLE_PARTITION_PERMISSION_MAP) as PartitionPermission[]

export const getHumanReadableTenantPermission = (p: TenantPermission): string => {
    return HUMAN_READABLE_TENANT_PERMISSION_MAP[p]
}

export const getHumanReadablePartitionPermission = (p: PartitionPermission): string => {
    return HUMAN_READABLE_PARTITION_PERMISSION_MAP[p]
}

export const joinTenantPermissions = (permissions: TenantPermission[]): string => {
    const localized = [] as string[]
    for (const permission of permissions) {
        const converted = getHumanReadableTenantPermission(permission)
        localized.push(converted)
    }

    return localized.join(", ")
}

export const joinPartitionPermissions = (permissions: PartitionPermission[]): string => {
    const localized = [] as string[]
    for (const permission of permissions) {
        const converted = getHumanReadablePartitionPermission(permission)
        localized.push(converted)
    }

    return localized.join(", ")
}
