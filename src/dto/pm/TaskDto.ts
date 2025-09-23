import type {TaskStatusDto} from "@/dto/pm/TaskStatusDto.ts";
import type {UserInfoDto} from "@/dto/user/UserInfoDto.ts";

export type TaskPriority = "LOWEST" | "LOW" | "MEDIUM" | "HIGH" | "HIGHEST"

export const ALL_TASK_PRIORITIES: TaskPriority[] = ["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST"]

const ALL_TASK_PRIORITIES_MAP: Record<TaskPriority, string> = {
    "LOWEST": "Lowest",
    "LOW": "Low",
    "MEDIUM": "Medium",
    "HIGH": "High",
    "HIGHEST": "Highest"
}

export type TaskCardDto = {
    id: number,
    taskIdentifier: string,
    taskStatusId?: number,
    assigneeId?: number,
    reporterId?: number,
    priority: number,
    encryptedName: string,
    iv: string,
}

export type TaskCardsDto = {
    tasks: TaskCardDto[]
}

export type TaskDto = TaskCardDto & {
    taskStatus?: TaskStatusDto,
    assignee?: UserInfoDto,
    reporter?: UserInfoDto,
    encryptedContent?: string,
}

export const humanizeTaskPriority = (p: TaskPriority) => ALL_TASK_PRIORITIES_MAP[p]
