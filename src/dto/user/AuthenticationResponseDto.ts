export type AuthenticationResponseDto = {
    userId: number,
    userEmail: string,
    authToken: string,
    kdfSettings?: string,
    publicRsaKey: string,
    notificationToken: `${string}-${string}-${string}-${string}-${string}`,
}
