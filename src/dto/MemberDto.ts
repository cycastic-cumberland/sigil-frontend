export type MemberDto = {
    email: string,
    firstName: string,
    lastName: string,
    avatarToken: string,
}

export type ExtendedMemberDto<T extends string> = MemberDto & {
    permissions: T[]
}