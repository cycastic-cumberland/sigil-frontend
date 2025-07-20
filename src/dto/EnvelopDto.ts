import type {CipherDto} from "@/dto/CipherDto.ts";
import type {WebAuthnCredentialDto} from "@/dto/webauthn.ts";

export type EnvelopDto = {
    passwordCipher: CipherDto | null,
    webAuthnCipher: WebAuthnCredentialDto | null,
}