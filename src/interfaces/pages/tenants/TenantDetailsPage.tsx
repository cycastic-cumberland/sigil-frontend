import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import {useEffect, useMemo, useRef, useState} from "react";
import type {TenantDto} from "@/dto/tenant/TenantDto.ts";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import {useTenant} from "@/contexts/TenantContext.tsx";
import TenantEditForm from "@/interfaces/components/TenantEditForm.tsx";
import {Button} from "@/components/ui/button.tsx";
import {notifyApiError} from "@/utils/errors.ts";
import {toast} from "sonner";
import {useConsent} from "@/contexts/ConsentContext.tsx";
import {usePageTitle} from "@/hooks/use-page-title.ts";

const TenantDetailsPage = () => {
    const [tenant, setTenant] = useState(null as TenantDto | null)
    const [isLoading, setIsLoading] = useState(true)
    const consentRef =useRef(null as Promise<boolean> | null)
    const {requireAgreement} = useConsent()
    const {tenantId} = useTenant()
    const { getTenant, saveTenant } = useTenant()
    const pageTitle = useMemo(() => tenant ? 'Manage ' + tenant.tenantName : 'Manage tenant', [tenant])

    usePageTitle(pageTitle)

    const reloadProject = async (id: number) => {
        try {
            setIsLoading(true);
            if (!id){
                return;
            }
            setTenant(await getTenant(id))
        } catch (e) {
            notifyApiError(e)
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (!tenantId){
            return
        }

        reloadProject(tenantId).then(undefined)
    }, [tenantId]);

    const onSave = async (tenant: TenantDto) => {
        if (!tenantId){
            throw Error("unreachable")
        }

        try {
            setIsLoading(true)

            await saveTenant(tenant)
            await reloadProject(tenantId!)
            toast.success("Project settings saved")
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const onDelete = async () => {
        if (!tenantId){
            throw Error("unreachable")
        }
        if (!await requireAgreement({
            title: 'Delete tenant',
            acceptText: 'Delete',
            message: 'Are you sure you want to delete this tenant? This action is irreversible.',
            destructive: true,
            ref: consentRef,
        })){
            return
        }

        toast.error("Unimplemented functionality")
    }

    return <MainLayout>
        { isLoading ? <FullSizeSpinner/> : !tenant ? <div className={"flex flex-col flex-grow w-full justify-center gap-2"}>
            <div className={"w-full flex flex-row justify-center"}>
                <Label className={"text-foreground font-bold text-4xl"}>
                    Tenant not found
                </Label>
            </div>
        </div> : <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-foreground font-bold"}>
                    {(!!tenant && tenant.membership === "OWNER") ? "Manage tenant" : "Tenant details"}
                </Label>
            </div>
            <div className={"w-full"}>
                <div className={"lg:w-1/2 text-foreground flex flex-col gap-2"}>
                    <TenantEditForm submissionText={"Save"}
                                    isLoading={isLoading}
                                    onSave={onSave}
                                    tenant={tenant} disableSave={!!tenant && tenant.membership !== "OWNER"}/>
                    {(!!tenant && tenant.membership === "OWNER") && <Button className={"cursor-pointer bg-destructive text-background border-destructive border-1 hover:bg-background hover:text-destructive"}
                            onClick={onDelete}
                            disabled>
                        Delete tenant
                    </Button>}
                </div>
            </div>
        </div> }
    </MainLayout>
}

export default TenantDetailsPage