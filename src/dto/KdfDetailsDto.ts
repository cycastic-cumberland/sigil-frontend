import type {Argon2Parameters} from "@/dto/Argon2Parameters.ts";
import type {CipherDto} from "@/dto/CipherDto.ts";
import type {WebAuthnCredentialDto} from "@/dto/webauthn.ts";

export type KdfDetailsDto = {
    algorithm: string,
    parameters: Argon2Parameters,
    salt: string,
    signatureVerificationWindow: number,
    wrappedUserKey: CipherDto,
    webAuthnCredential: WebAuthnCredentialDto
}
