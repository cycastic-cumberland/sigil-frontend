export type KanbanBoardEditFormDto = {
    boardName: string
}

export type KanbanBoardDto = KanbanBoardEditFormDto & {
    id: number,
}