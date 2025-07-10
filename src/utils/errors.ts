import axios, {type AxiosError} from "axios";
import {toast} from "sonner";

export const extractError = (e: unknown): string | undefined => {
    if (axios.isAxiosError(e)){
        const axiosError = e as AxiosError;
        // @ts-ignore
        const error = axiosError.response?.data?.message

        if (error){
            return error
        }
    }

    return undefined
}

export const notifyApiError = (e: unknown) => {
    toast.error(extractError(e) ?? 'Error encountered while proccessing request')
}