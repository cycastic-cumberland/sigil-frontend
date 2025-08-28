import axios, {type AxiosError} from "axios";
import {toast} from "sonner";

export const ExceptionCodes = {
    registrationInProgress: 'C400T011'
}

export type ApiException = {
    timestamp: string,
    status: number,
    exceptionCode?: string,
    path?: string,
    message?: string,
    stackTrace?: string,
    validationMessages?: Record<string, string[]>
}

export const isApiException = (payload?: unknown): payload is ApiException => {
    if (!payload){
        return false
    }
    const objKeys = Object.keys(payload as object)
    return objKeys.includes("timestamp") && objKeys.includes("status");
}

export const extractError = (e: unknown): string | undefined => {
    if (axios.isAxiosError(e)){
        const axiosError = e as AxiosError;
        const payload = axiosError.response?.data;
        if (isApiException(payload)){
            if (payload.validationMessages){
                const fields = Object.keys(payload.validationMessages)
                return `Validation failed for fields ${fields.join(", ")}`
            }
            if (payload.message){
                return payload.message;
            }
        }
    }

    if (e instanceof Error){
        return e.message
    }

    return undefined
}

export const notifyApiError = (e: unknown, toastId?: number | string) => {
    toast.error(extractError(e) ?? 'Error encountered while processing request', {
        id: toastId
    })
}