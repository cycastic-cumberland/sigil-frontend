import type {Argon2Parameters} from "@/dto/Argon2Parameters.ts";

export type KdfDetailsDto = {
    algorithm: string,
    parameters: Argon2Parameters,
    salt: string,
}
