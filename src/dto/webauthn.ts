import type {CipherDto} from "@/dto/CipherDto.ts";

export type Prf = {
    results: AuthenticationExtensionsPRFValues
}

export type WebAuthnCredentialDto = {
    credentialId: string
    salt: string
    transports: AuthenticatorTransport[]
    wrappedUserKey: CipherDto
}
