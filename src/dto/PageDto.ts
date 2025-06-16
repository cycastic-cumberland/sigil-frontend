export type PageDto<T> = {
    items: T[],
    page: number,
    pageSize: number,
    totalPages: number,
    totalElements: number,
}