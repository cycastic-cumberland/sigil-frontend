export type Callback<TParam, TRet = void> = (value: TParam) => TRet

export type BlockingFC = {
    isLoading: boolean,
    setIsLoading: Callback<boolean>,
}
