import {useNavigate, useSearchParams} from "react-router";
import {useEffect, useState} from "react";
import {toast} from "sonner";
import {BACKEND_AUTHORITY} from "@/api.ts";
import axios from "axios";
import {notifyApiError} from "@/utils/errors.ts";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";

type InvitationProbeResultDto = {
    email: string,
    active: boolean
}

const CompleteTenantInvitationPage = () => {
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
        if (!submission.startsWith(`${BACKEND_AUTHORITY}/api/public/tenant/complete-invitation`)){
            toast.error('Invalid invitation completion URL')
            navigate('/login')
            return;
        }

        continueRegistration(submission).then(undefined)
    }, [submission, firstLoad]);

    const continueRegistration = async (submissionUrl: string) => {
        try {
            const response = await axios.get(submissionUrl)
            const probeResult = response.data as InvitationProbeResultDto;
            if (!probeResult.active){
                navigate(`/complete-signup?submission=${encodeURIComponent(submissionUrl)}`)
                return
            }

            const queryParamsSplit = submissionUrl.split("?").filter(s => s)
            if (queryParamsSplit.length < 2){
                await axios.post(submissionUrl)
                navigate('/')
                return
            }

            const parameters = queryParamsSplit.slice(1).join("?").split("&").filter(s => s)
            const tenantIdParam = parameters.filter(s => s.startsWith("tenantId="))[0]
            const tenantId = Number(tenantIdParam.split("tenantId=").filter(s => s)[0])
            await axios.post(submissionUrl, {})
            toast.success("Tenant joined")
            navigate(`/tenant/${tenantId}/partitions/browser`)
        } catch (e: unknown) {
            notifyApiError(e)
            navigate('/')
        }
    }

    return <div className={'min-h-screen w-full flex flex-col'}>
        <FullSizeSpinner/>
    </div>
}

export default CompleteTenantInvitationPage
