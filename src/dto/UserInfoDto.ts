export interface UserInfoDto {
    id: number
    email: string
    firstName: string
    lastName: string
    roles: string[]
    publicRsaKey: string,
    hasWebAuthnCredential: boolean,
    joinedAt: string
}
