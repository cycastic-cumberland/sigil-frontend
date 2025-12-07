import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {type ChangeEvent, type SyntheticEvent, useEffect, useState} from "react";
import {Label} from "@/components/ui/label.tsx";
import {
    AdminUserCreatePageEditForm,
    type AdminUserCreatePageEditFormType,
    defaultFormValues
} from "@/interfaces/pages/admin/users/AdminUserCreatePage.EditForm.tsx";
import type {Callback} from "@/utils/misc.ts";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {cn} from "@/lib/utils.ts";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {notifyApiError} from "@/utils/errors.ts";
import {toast} from "sonner";
import {getUserRole, PasswordValidationText, validatePassword} from "@/utils/auth.ts";
import {
    generateEncodedRsaOaepWithSha256KeyPair,
    toEnrollPasswordBasedCipher,
    uint8ArrayToBase64
} from "@/utils/cryptography.ts";
import api from "@/api.ts";
import type {IdDto} from "@/dto/IdDto.ts";
import {useNavigate} from "react-router";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {ArrowLeft} from "lucide-react";

type FormType = AdminUserCreatePageEditFormType & {
    password: string,
    repeatPassword: string
}

const defaultFormValuesInternal = (): FormType => {
    return {
        ...defaultFormValues(),
        password: '',
        repeatPassword: '',
    }
}

const AdminUserCreatePage = () => {
    const [formValues, setFormValues] = useState(defaultFormValuesInternal())
    const [isLoading, setIsLoading] = useState(false)
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const navigate = useNavigate()

    const onSetFormValues= (cb: Callback<AdminUserCreatePageEditFormType, AdminUserCreatePageEditFormType>) => {
        setFormValues(f => ({
            ...f,
            ...cb(f)
        }))
    }

    const handleChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { id, value, type, checked } = e.target;
        setFormValues((prev) => ({
            ...prev,
            [id]:
                type === 'checkbox'
                    ? checked
                    : value,
        }))
    }

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault()
        try {
            setIsLoading(true)
            if (formValues.password !== formValues.repeatPassword){
                toast.error("Password does not match");
                return
            }
            if (!validatePassword(formValues.password)){
                toast.error(PasswordValidationText)
                return
            }

            const {publicKey, privateKey} = await generateEncodedRsaOaepWithSha256KeyPair()
            const passwordCredential = await toEnrollPasswordBasedCipher(formValues.password, privateKey)

            const response = await api.put('admin/users', {
                email: formValues.email,
                roles: formValues.roles,
                emailVerified: formValues.emailVerified,
                status: formValues.status,
                form: {
                    publicRsaKey: uint8ArrayToBase64(publicKey),
                    firstName: formValues.firstName,
                    lastName: formValues.lastName,
                    passwordCredential
                }
            })

            const id = (response.data as IdDto).id
            if (!id){
                toast.error('Failed to create user')
                return
            }

            toast.success('User created')
            navigate('/admin/user/details/' + id)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (!(getUserRole() ?? []).includes('ADMIN')){
            toast.error("You don't have enough permission to access this page")
            navigate('/')
        }
    }, [navigate])

    return <MainLayout>
        <div className={cn("p-5 flex flex-col gap-2", isDesktop ? 'w-1/2' : 'w-full')}>
            <Label className={"my-2 text-2xl text-foreground font-bold"}>
                Create user
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
                        <Label className="w-32">Password:</Label>
                        <Input
                            className={"flex-1 border-foreground"}
                            value={formValues.password}
                            onChange={handleChange}
                            id={"password"}
                            type={'password'}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="flex flex-row gap-2">
                        <Label className="w-32">Repeat password:</Label>
                        <Input
                            className={"flex-1 border-foreground"}
                            value={formValues.repeatPassword}
                            onChange={handleChange}
                            id={"repeatPassword"}
                            type={'password'}
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>
                <Button className={'mt-4 w-full flex flex-grow text-primary border-primary border-2 cursor-pointer hover:bg-primary hover:text-background'}
                        disabled={isLoading}
                        type={"submit"}>
                    {isLoading && <Spinner/>}
                    Create
                </Button>
            </form>
        </div>
    </MainLayout>
}

export default AdminUserCreatePage