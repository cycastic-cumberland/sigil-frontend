export type EntitlementDataType = Record<string, unknown>

export type EntitlementDto = {
    entitlementType: string,
    tenantId: number,
    data: EntitlementDataType
}
