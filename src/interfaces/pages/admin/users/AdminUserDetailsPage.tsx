import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {
    AdminUserCreatePageEditForm,
    type AdminUserCreatePageEditFormType,
    defaultFormValues
} from "@/interfaces/pages/admin/users/AdminUserCreatePage.EditForm.tsx";
import {type SyntheticEvent, useEffect, useState} from "react";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import type {Callback} from "@/utils/misc.ts";
import {Label} from "@/components/ui/label.tsx";
import {cn} from "@/lib/utils.ts";
import {Button} from "@/components/ui/button.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {notifyApiError} from "@/utils/errors.ts";
import api from "@/api.ts";
import {formatQueryParameters} from "@/utils/format.ts";
import {useNavigate, useParams} from "react-router";
import type {UserInfoDto} from "@/dto/user/UserInfoDto.ts";
import {base64ToUint8Array, createPublicKey, toPem} from "@/utils/cryptography.ts";
import {Textarea} from "@/components/ui/textarea.tsx";
import {toast} from "sonner";
import {getUserRole} from "@/utils/auth.ts";

type FormType = AdminUserCreatePageEditFormType & {
    publicRsaKey: string
}

const defaultFormValuesInternal = (): FormType => {
    return {
        ...defaultFormValues(),
        publicRsaKey: '',
    }
}

const AdminUserDetailsPage = () => {
    const [formValues, setFormValues] = useState(defaultFormValuesInternal())
    const [isLoading, setIsLoading] = useState(true)
    const {userId} = useParams()
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const navigate = useNavigate()

    const onSetFormValues= (cb: Callback<AdminUserCreatePageEditFormType, AdminUserCreatePageEditFormType>) => {
        setFormValues(f => ({
            ...f,
            ...cb(f)
        }))
    }

    const loadData = async () => {
        try {
            setIsLoading(true)
            const response = await api.get(formatQueryParameters('/admin/users/user', {
                id: userId
            }))

            const userDetails = response.data as UserInfoDto
            const publicKey = await createPublicKey(base64ToUint8Array(userDetails.publicRsaKey), false)
            const publicRsaKey = await toPem(publicKey)
            setFormValues({
                id: userDetails.id,
                firstName: userDetails.firstName,
                lastName: userDetails.lastName,
                email: userDetails.email,
                emailVerified: userDetails.emailVerified,
                status: userDetails.status,
                roles: userDetails.roles,
                publicRsaKey,
            })
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault()
        let success = false
        try {
            setIsLoading(true)

            await api.post('admin/users', {
                id: formValues.id,
                firstName: formValues.firstName,
                lastName: formValues.lastName,
                email: formValues.email,
                emailVerified: formValues.emailVerified,
                status: formValues.status,
                roles: formValues.roles,
            })

            success = true
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }

        if (success) {
            toast.success('User saved')
            loadData().then(undefined)
        }
    }

    useEffect(() => {
        loadData().then(undefined)
    }, [])

    useEffect(() => {
        if (!(getUserRole() ?? []).includes('ADMIN')){
            toast.error("You don't have enough permission to access this page")
            navigate('/')
        }
    }, [navigate])

    return <MainLayout>
        <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-foreground font-bold"}>
                    Edit user
                </Label>
            </div>
            <div className={cn("my-3 flex gap-2", isDesktop ? 'w-1/2' : 'w-full')}>
                <form onSubmit={handleSubmit} className={'w-full'}>
                    <div className="grid gap-2">
                        <AdminUserCreatePageEditForm values={formValues} setValues={onSetFormValues} isLoading={isLoading}/>
                        <div className="flex flex-row gap-2">
                            <Label className="w-32">Public key:</Label>
                            <Textarea className={"flex-1 border-foreground"}
                                      value={formValues.publicRsaKey}
                                      required
                                      readOnly/>
                        </div>
                    </div>
                    <Button className={'mt-4 w-full flex flex-grow text-primary border-primary border-2 cursor-pointer hover:bg-primary hover:text-background'}
                            disabled={isLoading}
                            type={"submit"}>
                        {isLoading && <Spinner/>}
                        Save
                    </Button>
                </form>
            </div>
        </div>
    </MainLayout>
}

export default AdminUserDetailsPage