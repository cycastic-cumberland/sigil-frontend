import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {type ChangeEvent, type SyntheticEvent, useState} from "react";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {useNavigate} from "react-router";
import {cn} from "@/lib/utils.ts";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ArrowLeft, Plus} from "lucide-react";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {Input} from "@/components/ui/input.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import api from "@/api.ts";
import {notifyApiError} from "@/utils/errors.ts";
import {toast} from "sonner";
import {useTenant} from "@/contexts/TenantContext.tsx";
import {usePageTitle} from "@/hooks/use-page-title.ts";

type FormType = {
    entitlementType: string,
    jsonData: string,
}

const AdminEntitlementCreatePage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [formValues, setFormValues] = useState({
        entitlementType: '',
        jsonData: ''
    } as FormType)
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const navigate = useNavigate()
    const {tenantId} = useTenant()

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { id, value } = e.target;
        setFormValues((prev) => ({
            ...prev,
            [id]: value,
        }));
    }

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault()
        let success = false
        const {entitlementType, jsonData} = formValues
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
            navigate(`/admin/entitlements/${tenantId}/details/${encodeURIComponent(entitlementType)}`)
        }
    }

    usePageTitle('Create entitlement')

    return <MainLayout>
        <div className={cn("p-5 flex flex-col gap-2", isDesktop ? 'w-1/2' : 'w-full')}>
            <Label className={"my-2 text-2xl text-foreground font-bold"}>
                Create entitlement
            </Label>
            <div>
                <Button className={'text-background bg-foreground border-2 border-foreground cursor-pointer hover:border-solid hover:text-foreground hover:bg-background'}
                        onClick={() => navigate(-1)}>
                    <ArrowLeft/>
                    Back
                </Button>
            </div>
            <form onSubmit={handleSubmit} className={'w-full'}>
                <div className="grid gap-2">
                    <div className="flex flex-row gap-2">
                        <Label className="w-32">Type:</Label>
                        <Input
                            className={"flex-1 border-foreground"}
                            value={formValues.entitlementType}
                            onChange={handleChange}
                            id={"entitlementType"}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="flex flex-row gap-2">
                        <Label className="w-32">JSON value:</Label>
                        <Textarea
                            className={"flex-1 border-foreground"}
                            value={formValues.jsonData}
                            onChange={handleChange}
                            id={"jsonData"}
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>
                <Button className={'mt-4 w-full flex flex-grow text-primary border-primary border-2 cursor-pointer hover:bg-primary hover:text-background'}
                        disabled={isLoading}
                        type={"submit"}>
                    {isLoading ? <Spinner/> : <Plus/>}
                    Create
                </Button>
            </form>
        </div>
    </MainLayout>
}

export default AdminEntitlementCreatePage