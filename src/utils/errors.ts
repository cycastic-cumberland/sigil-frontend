import axios, {type AxiosError} from "axios";
import {toast} from "sonner";

export const notifyApiError = (e: unknown) => {
    if (axios.isAxiosError(e)){
        const axiosError = e as AxiosError;
        // @ts-ignore
        const error = axiosError.response?.data?.message

        if (error){
            toast.error(error)
            return
        }
    }

    toast.error('Error encountered while proccessing request')
}