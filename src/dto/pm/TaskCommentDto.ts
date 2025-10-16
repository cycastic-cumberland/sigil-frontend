import type {UserInfoDto} from "@/dto/user/UserInfoDto.ts";
import type {CipherDto} from "@/dto/cryptography/CipherDto.ts";

export type TaskCommentDto = {
    id: number,
    taskIdentifier: string,
    sender: UserInfoDto,
    encryptedContent: CipherDto,
    createdAt: string,
    updatedAt?: string,
}