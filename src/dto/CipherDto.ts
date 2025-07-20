export type CipherDecryptionMethod = "USER_PASSWORD" | "UNWRAPPED_USER_KEY" | "SERVER_SIDE" | "UNWRAPPED_PARTITION_KEY" | "WEBAUTHN_KEY"

export type CipherDto = {
    decryptionMethod: CipherDecryptionMethod,
    iv: string | null,
    cipher: string
}