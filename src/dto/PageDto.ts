export type PageDto<T> = {
    items: T[],
    page: number,
    pageSize: number,
    totalPages: number,
    totalElements: number,
}

export type EnumerablePageDto<T> = {
    items: T[],
    prevToken?: string,
    nextToken?: string,
}