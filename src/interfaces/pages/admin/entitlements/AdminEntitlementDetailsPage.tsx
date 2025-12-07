import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {cn} from "@/lib/utils.ts";
import {Label} from "@/components/ui/label.tsx";
import {useNavigate, useParams} from "react-router";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {type RefObject, useCallback, useEffect, useRef, useState} from "react";
import {useTenant} from "@/contexts/TenantContext.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ArrowLeft, Save, Trash} from "lucide-react";
import {notifyApiError} from "@/utils/errors.ts";
import api from "@/api.ts";
import {formatQueryParameters} from "@/utils/format.ts";
import type {EntitlementDto} from "@/dto/EntitlementDto.ts";
import {Textarea} from "@/components/ui/textarea.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {toast} from "sonner";
import {useConsent} from "@/contexts/ConsentContext.tsx";

const AdminEntitlementDetailsPage = () => {
    const confirmationRef: RefObject<Promise<boolean> | null> = useRef(null)
    const [isLoading, setIsLoading] = useState(false)
    const [jsonData, setJsonData] = useState('')
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const navigate = useNavigate()
    const {entitlementType} = useParams()
    const {tenantId} = useTenant()
    const {requireAgreement} = useConsent()

    const getEntitlement = useCallback(async () => {
        try {
            setIsLoading(true)

            const response = await api.get(formatQueryParameters('admin/entitlements/entitlement', {
                tenantId,
                entitlementType
            }))
            const entitlement = response.data as EntitlementDto
            setJsonData(JSON.stringify(entitlement.data, undefined, 2))
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }, [entitlementType, tenantId])

    const saveEntitlement = useCallback(async () => {
        let success = false
        try {
            setIsLoading(true)

            await api.post('admin/entitlements', {
                entitlementType,
                tenantId,
                data: JSON.parse(jsonData)
            })

            success = true
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }

        if (success){
            toast.success("Entitlement saved")
            getEntitlement().then(undefined)
        }
    }, [entitlementType, getEntitlement, jsonData, tenantId])

    const deleteEntitlement = useCallback(async () => {
        let success = false
        try {
            setIsLoading(true)
            if (!await requireAgreement({
                title: 'Delete entitlement',
                acceptText: 'Delete',
                message: 'Deleting entitlements will render some functionalities no longer available to this tenant.',
                destructive: true,
                ref: confirmationRef,
            })){
                return
            }

            await api.delete(formatQueryParameters('admin/entitlements', {
                entitlementType,
                tenantId,
            }))

            success = true
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }

        if (success){
            toast.success("Entitlement deleted")
            navigate(`/admin/entitlements/${tenantId}`)
        }
    }, [])

    useEffect(() => {
        if (!entitlementType){
            navigate(`/admin/entitlements/${tenantId}`)
        }
    }, [navigate, entitlementType, tenantId])

    useEffect(() => {
        getEntitlement().then(undefined)
    }, [getEntitlement]);

    return <MainLayout>
        <div className={cn("p-5 flex flex-col gap-2", isDesktop ? 'w-1/2' : 'w-full')}>
            <Label className={"my-2 text-2xl text-foreground font-bold"}>
                {entitlementType}
            </Label>
            <div>
                <Button className={'text-background bg-foreground border-2 border-foreground cursor-pointer hover:border-solid hover:text-foreground hover:bg-background'}
                        onClick={() => navigate(-1)}>
                    <ArrowLeft/>
                    Back
                </Button>
            </div>
            <Textarea value={jsonData}
                      disabled={isLoading}
                      onChange={e => setJsonData(e.target.value)}/>
            <Button className={'mt-4 w-full flex flex-grow text-primary border-primary border-2 cursor-pointer hover:bg-primary hover:text-background'}
                    disabled={isLoading}
                    onClick={saveEntitlement}>
                {isLoading ? <Spinner/> : <Save/>}
                Save
            </Button>
            <Button type={'button'} variant={'destructive'} className={'cursor-pointer'} onClick={deleteEntitlement} disabled={isLoading}>
                <Trash/>
                Delete
            </Button>
        </div>
    </MainLayout>
}

export default AdminEntitlementDetailsPage