export type TenantPermission = "MEMBER" | "CREATE_PARTITIONS" | "DELETE_PARTITIONS" | "MODERATE" | "LIST_USERS"

export type PartitionPermission = "READ" | "WRITE" | "MODERATE"

const HUMAN_READABLE_PARTITION_PERMISSIONS: Record<PartitionPermission, string> = {
    "READ": "Read",
    "WRITE": "Write",
    "MODERATE": "Moderate"
}

export const getHumanReadablePartitionPermission = (p: PartitionPermission): string => {
    return HUMAN_READABLE_PARTITION_PERMISSIONS[p]
}

export const joinTenantPermissions = (permissions: TenantPermission[]): string => {
    const localized = [] as string[]
    for (const permission of permissions) {
        switch (permission){
            case "MEMBER":
                localized.push("Member")
                break;
            case "CREATE_PARTITIONS":
                localized.push("Create partitions")
                break;
            case "DELETE_PARTITIONS":
                localized.push("Delete partitions")
                break;
            case "MODERATE":
                localized.push("Moderate")
                break;
            case "LIST_USERS":
                localized.push("List users")
                break;
        }
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
