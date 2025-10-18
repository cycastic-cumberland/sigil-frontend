import type {CipherDto} from "@/dto/cryptography/CipherDto.ts";

export type EnrollPasswordBasedCipherDto = {
    keyDerivationSettings: string,
    cipher: CipherDto
}

export type EnrollPasswordBasedCipherSignedDto = {
    signatureAlgorithm: string,
    signature: string
}
