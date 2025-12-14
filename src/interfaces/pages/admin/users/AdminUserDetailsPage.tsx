import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {
    AdminUserCreatePageEditForm,
    type AdminUserCreatePageEditFormType,
    defaultFormValues
} from "@/interfaces/pages/admin/users/AdminUserCreatePage.EditForm.tsx";
import {type FC, type SyntheticEvent, useCallback, useEffect, useState} from "react";
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
import {toast} from "sonner";
import {getAuth, getUserRole} from "@/utils/auth.ts";
import {ArrowLeft, Download, Save} from "lucide-react";
import {getAdminTenantListingLink} from "@/utils/path.ts";
import TenantTable from "@/interfaces/components/TenantTable.tsx";
import {useConsent} from "@/contexts/ConsentContext.tsx";
import {usePageTitle} from "@/hooks/use-page-title.ts";

type FormType = AdminUserCreatePageEditFormType & {
    publicRsaKey: string
}

const defaultFormValuesInternal = (): FormType => {
    return {
        ...defaultFormValues(),
        publicRsaKey: '',
    }
}

const downloadKey = (key: string, name: string) => {
    const blob = new Blob([key], { type: "application/x-pem-file" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

const TenantTableInternal: FC<{
    userId: number
}> = ({userId}) => {
    const [isLoading, setIsLoading] = useState(true)
    const navigate = useNavigate()

    return <TenantTable isLoading={isLoading}
                        setIsLoading={setIsLoading}
                        userId={Number(userId)}
                        getRowLink={getAdminTenantListingLink}
                        onSelect={t => navigate(getAdminTenantListingLink(t))}/>
}

const AdminUserDetailsPage = () => {
    const [formValues, setFormValues] = useState(defaultFormValuesInternal())
    const [isLoading, setIsLoading] = useState(true)
    const [currentUserId, setCurrentUserId] = useState(null as number | null)
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const {userId} = useParams()
    const {requireDecryption} = useConsent()
    const navigate = useNavigate()

    const onSetFormValues= (cb: Callback<AdminUserCreatePageEditFormType, AdminUserCreatePageEditFormType>) => {
        setFormValues(f => ({
            ...f,
            ...cb(f)
        }))
    }

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true)
            const response = await api.get(formatQueryParameters('/admin/users/user', {
                id: userId
            }))

            const userDetails = response.data as UserInfoDto
            const publicRsaKey = userDetails.publicRsaKey ? await toPem(await createPublicKey(base64ToUint8Array(userDetails.publicRsaKey), false)) : ''
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
    }, [userId])

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

    const downloadPublicKey = () => {
        downloadKey(formValues.publicRsaKey, `${formValues.firstName} ${formValues.lastName} public key.pem`)
    }

    const downloadPrivateKey = async () => {
        try {
            setIsLoading(true)

            const privateKey = await requireDecryption()
            const pem = await toPem(privateKey)
            downloadKey(pem, `${formValues.firstName} ${formValues.lastName}.pem`)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    usePageTitle('User details')

    useEffect(() => {
        loadData().then(undefined)
    }, [loadData])

    useEffect(() => {
        if (!(getUserRole() ?? []).includes('ADMIN')){
            toast.error("You don't have enough permission to access this page")
            navigate('/')
        }
    }, [navigate])

    useEffect(() => {
        const data = getAuth()
        if (!data){
            toast.error('Could not get user session')
            return
        }

        setCurrentUserId(data.userId)
    }, [])

    if (!currentUserId){
        return <MainLayout/>
    }

    return <MainLayout>
        <div className={cn("p-5 flex flex-col gap-2", isDesktop ? 'w-1/2' : 'w-full')}>
            <Label className={"my-2 text-2xl text-foreground font-bold"}>
                Edit user
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
                    <AdminUserCreatePageEditForm values={formValues} setValues={onSetFormValues} isLoading={isLoading}/>
                    <div className="flex flex-row gap-2">
                        <Label className="w-32">Public key:</Label>
                        <Button className={'flex-1 cursor-pointer'}
                                onClick={downloadPublicKey}
                                variant={'outline'}
                                disabled={isLoading || formValues.publicRsaKey === ''}
                                type={'button'}>
                            <Download/>
                            Download
                        </Button>
                    </div>
                    {currentUserId === formValues.id && <div className="flex flex-row gap-2">
                        <Label className="w-32">Private key:</Label>
                        <Button className={'flex-1 cursor-pointer'}
                                onClick={downloadPrivateKey}
                                variant={'outline'}
                                disabled={isLoading}
                                type={'button'}>
                            <Download/>
                            Download
                        </Button>
                    </div>}
                </div>
                <Button className={'mt-4 w-full flex flex-grow text-primary border-primary border-2 cursor-pointer hover:bg-primary hover:text-background'}
                        disabled={isLoading}
                        type={"submit"}>
                    {isLoading ? <Spinner/> : <Save/>}
                    Save
                </Button>
            </form>
            <Label className={"my-2 text-2xl text-foreground font-bold"}>
                Tenants
            </Label>
            <TenantTableInternal userId={!Number.isNaN(userId) ? Number(userId) : -1}/>
        </div>
    </MainLayout>
}

export default AdminUserDetailsPage