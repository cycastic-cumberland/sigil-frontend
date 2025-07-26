export type BaseUserInfoDto = {
    email: string
    firstName: string
    lastName: string
}

export type UserInfoDto = BaseUserInfoDto & {
    id: number
    roles: string[]
    publicRsaKey: string,
    hasWebAuthnCredential: boolean,
    joinedAt: string
}
