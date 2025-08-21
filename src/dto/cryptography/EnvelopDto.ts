import type {CipherDto} from "@/dto/cryptography/CipherDto.ts";
import type {WebAuthnCredentialDto} from "@/dto/cryptography/webauthn.ts";

export type EnvelopDto = {
    passwordCipher: CipherDto | null,
    webAuthnCipher: WebAuthnCredentialDto | null,
}