export interface BaseSmtpCredentialDto {
    id: number
    serverAddress: string
    secureSmtp: string
    port: number
    timeout: number
    fromName: string
}

export interface DecryptedSmtpCredentialDto {
    id: number | undefined,
    serverAddress: string
    secureSmtp: string
    port: number
    timeout: number
    fromName: string
    fromAddress: string
    password: string
}
