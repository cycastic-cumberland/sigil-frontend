import type {CipherDto} from "@/dto/CipherDto.ts";

export type AuthenticationResponseDto = {
    userId: number,
    userEmail: string,
    authToken: string,
    kdfSettings: string,
    publicRsaKey: string,
    wrappedUserKey: CipherDto,
}
