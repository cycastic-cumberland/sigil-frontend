import {useNavigate, useSearchParams} from "react-router";
import {useEffect, useState} from "react";
import {notifyApiError} from "@/utils/errors.ts";
import axios from "axios";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import {toast} from "sonner";
import {BACKEND_AUTHORITY} from "@/api.tsx";

const CompleteSignupPage = () => {
    const [searchParams] = useSearchParams()
    const [submission, setSubmission] = useState(null as string | null)
    const [firstLoad, setFirstLoad] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        setSubmission(searchParams.get('submission'))
        setFirstLoad(false)
    }, [searchParams]);

    useEffect(() => {
        if (!submission){
            if (firstLoad){
                return
            }

            toast.error('Invalid registration completion URL')
            navigate('/login')
            return
        }
        if (!submission.startsWith(`${BACKEND_AUTHORITY}/api/auth/complete`)){
            toast.error('Invalid registration completion URL')
            navigate('/login')
            return;
        }

        completeRegistration(submission).then(undefined)
    }, [submission, firstLoad]);

    const completeRegistration = async (submissionUrl: string) => {
        try {
            await axios.post(submissionUrl)
            toast.success('Registration completed! Please sign in again')
            navigate('/login')
        } catch (e: unknown) {
            notifyApiError(e)
            navigate('/login')
        }
    }

    return <div className={'min-h-screen w-full flex flex-col'}>
        <FullSizeSpinner/>
    </div>
}

export default CompleteSignupPage