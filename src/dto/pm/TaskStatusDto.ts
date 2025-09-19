export type TaskStatusDto = {
    id: number,
    statusName: string,
    previousTaskStatusId?: number,
    nextTaskStatusId?: number,
}

export type TaskStatusesDto = {
    taskStatuses: TaskStatusDto[]
}
