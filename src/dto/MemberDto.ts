export type MemberDto = {
    email: string,
    firstName: string,
    lastName: string,
}

export type ExtendedMemberDto<T extends string> = MemberDto & {
    permissions: T[]
}