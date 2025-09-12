export type Callback<TParam, TRet = void> = (value: TParam) => TRet

export type BlockingFC = {
    isLoading: boolean,
    setIsLoading: Callback<boolean>,
}

export interface FulfillablePromise<T> extends Promise<T> {
    readonly isFulfilled: boolean,
    readonly isPending: boolean,
    readonly isRejected: boolean,
}

class FulfillablePromiseImpl<T> implements FulfillablePromise<T> {
    private readonly promise: Promise<T>
    private fulfilled = false
    private pending = true
    private rejected = false

    constructor(promise: Promise<T>) {
        this.promise = promise
    }

    public static typeTag() {
        return 'FulfillablePromiseImpl'
    }

    get [Symbol.toStringTag](){
        return FulfillablePromiseImpl.typeTag()
    }

    get isFulfilled() {
        return this.fulfilled
    }

    get isPending() {
        return this.pending
    }

    get isRejected() {
        return this.rejected
    }

    catch<TResult = never>(onrejected?: ((reason: unknown) => (PromiseLike<TResult> | TResult)) | undefined | null): Promise<T | TResult> {
        this.rejected = true
        this.pending = false
        return this.promise.catch(onrejected)
    }

    finally(onfinally?: (() => void) | undefined | null): Promise<T> {
        if (this.promise.finally){
            return this.promise.finally(onfinally)
        }

        return this.promise
    }

    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => (PromiseLike<TResult1> | TResult1)) | undefined | null, onrejected?: ((reason: unknown) => (PromiseLike<TResult2> | TResult2)) | undefined | null): Promise<TResult1 | TResult2> {
        this.fulfilled = true
        this.pending = false
        return this.promise.then(onfulfilled, onrejected)
    }
}

export const makeFulfillablePromise = <T>(promise: Promise<T> | FulfillablePromise<T>): FulfillablePromise<T> => {
    if (promise instanceof FulfillablePromiseImpl){
        return promise
    }

    return new FulfillablePromiseImpl(promise)
}
