export type ResendConfirmationDto = {
    email: string
}

export type RegisterUserDto = ResendConfirmationDto & {
    firstName: string
    lastName: string
    password: string,
    confirmPassword: string,
}