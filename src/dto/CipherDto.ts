export type CipherDecryptionMethod = "USER_PASSWORD" | "UNWRAPPED_USER_KEY" | "SERVER_SIDE"

export type CipherDto = {
    decryptionMethod: CipherDecryptionMethod,
    kid: string,
    iv: string | null,
    cipher: string
}