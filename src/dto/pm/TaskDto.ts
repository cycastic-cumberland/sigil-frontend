import type {TaskStatusDto} from "@/dto/pm/TaskStatusDto.ts";
import type {UserInfoDto} from "@/dto/user/UserInfoDto.ts";

export type TaskPriority = "LOWEST" | "LOW" | "MEDIUM" | "HIGH" | "HIGHEST"

export type TaskDto = {
    id: number,
    taskIdentifier: string,
    taskStatus?: TaskStatusDto,
    assignee?: UserInfoDto,
    reporter?: UserInfoDto,
    priority: TaskPriority,
    encryptedName: string,
    encryptedContent?: string,
    iv: string,
}
