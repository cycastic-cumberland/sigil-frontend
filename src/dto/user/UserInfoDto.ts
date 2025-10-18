export type BaseUserInfoDto = {
    email: string
    firstName: string
    lastName: string
}

export type UserRole = "COMMON" | "ADMIN"

export type UserInfoDto = BaseUserInfoDto & {
    id: number
    roles: UserRole[]
    publicRsaKey: string,
    hasPasswordCredential: boolean,
    hasWebAuthnCredential: boolean,
    tenantOwnerCount: number,
    joinedAt: string
}
