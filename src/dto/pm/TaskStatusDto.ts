export const AllTaskUniqueStereotypes = ["BACKLOG", "READY_FOR_DEVELOPMENT", "COMPLETION"]

export type TaskUniqueStereotype = typeof AllTaskUniqueStereotypes[number]

const humanizedTaskUniqueStereotype: Record<TaskUniqueStereotype, string> = {
    'BACKLOG': 'Backlog',
    'READY_FOR_DEVELOPMENT': 'Ready for development',
    'COMPLETION': 'Completed',
}

export type TaskProgressDto = {
    fromStatusId: number,
    toStatusId: number,
    name: string
}

export type TaskStatusDto = {
    id: number,
    statusName: string,
    previousTaskStatuses?: TaskProgressDto[],
    nextTaskStatuses?: TaskProgressDto[],
    stereotype?: TaskUniqueStereotype,
}

export type TaskStatusesDto = {
    taskStatuses: TaskStatusDto[]
}

export const humanizeTaskUniqueStereotype = (stereotype: TaskUniqueStereotype): string => {
    return humanizedTaskUniqueStereotype[stereotype]
}
