import {type ChangeEvent, type FC, type HTMLAttributes, type SyntheticEvent, useEffect, useState} from "react";
import type {RegisterUserDto} from "@/dto/RegisterUserDto.ts";
import {cn} from "@/lib/utils.ts";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {Link} from "react-router";
import {notifyApiError} from "@/utils/errors.ts";
import api from "@/api.ts";
import {toast} from "sonner";

const RegisterForm: FC<HTMLAttributes<HTMLDivElement> & {
    formData: RegisterUserDto,
    onRegister: (r: RegisterUserDto) => void,
    isLoading: boolean,
}> = ({ className, formData, onRegister, isLoading }) => {
    const [formValues, setFormValues] = useState(formData)

    useEffect(() => {
        setFormValues({ ...formData });
    }, [formData]);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { id, value } = e.target;
        setFormValues((prev) => ({
            ...prev,
            [id]: value,
        }));
    };

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        onRegister({ ...formValues });
    };

    return <div className={cn("grid gap-6", className)}>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-2">
                <div className={"flex flex-col gap-2 text-center"}>
                    <h1 className={"text-2xl font-semibold tracking-tight text-foreground"}>
                        Create a Sigil account
                    </h1>
                    <p className={"text-muted-foreground text-sm"}>
                        Enter your email to continue
                    </p>
                </div>
                <div className="grid gap-1">
                    <Label className="sr-only" htmlFor="email">
                        Email
                    </Label>
                    <Input
                        id="email"
                        placeholder="Email"
                        value={formValues.email}
                        onChange={handleChange}
                        className={"text-foreground"}
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect="off"
                        disabled={isLoading}
                        required
                    />
                </div>
                <Button disabled={isLoading}
                        type={"submit"}
                        className={"hover:text-foreground cursor-pointer bg-foreground text-background"}>
                    {isLoading && (
                        <Spinner/>
                    )}
                    Register
                </Button>
                <div className="flex items-center">
                    <hr className="flex-grow border-t border-muted-foreground"/>
                    <span className="mx-2 text-sm text-muted-foreground">or</span>
                    <hr className="flex-grow border-t border-muted-foreground"/>
                </div>
                <Button disabled={isLoading}
                        className={'hover:text-background hover:bg-foreground cursor-pointer bg-background text-foreground shadow-none'}
                        asChild>
                    <Link to={'/login'}>
                        Log in with email
                    </Link>
                </Button>
            </div>
        </form>
    </div>
}

const EmailSentComponent: FC<HTMLAttributes<HTMLDivElement> & {
    isLoading: boolean,
    onResend: () => void,
}> = ({ className, isLoading, onResend }) => {
    return <div className={cn("grid gap-6", className)}>
        <div className="grid gap-2">
            <div className={"flex flex-col gap-2 text-center"}>
                <h1 className={"text-2xl font-semibold tracking-tight text-foreground"}>
                    Verification required
                </h1>
                <p className={"text-muted-foreground text-sm"}>
                    To make sure you own this email account, we have sent a verification email. Check your inbox and proceed as instructed.
                </p>
                <Button disabled={isLoading}
                        onClick={onResend}
                        className={'hover:text-foreground cursor-pointer bg-foreground text-background'}>
                    Resend Email
                </Button>
                <Button disabled={isLoading}
                        className={'hover:text-background hover:bg-foreground cursor-pointer bg-background text-foreground shadow-none'}
                        asChild>
                    <Link to={'/login'}>
                        Log in with Email
                    </Link>
                </Button>
            </div>
        </div>
    </div>
}

const RegisterPage = () => {
    const [emailSent, setEmailSent] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
    } as RegisterUserDto)

    const onSubmit = async (data: RegisterUserDto) => {
        try {
            setIsLoading(true)
            setFormData(data)

            await api.post('auth/register', data)
            setEmailSent(true)
        } catch (e: unknown){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const onResend = async () => {
        try {
            setIsLoading(true)

            await api.post('auth/register/resend', {
                email: formData.email
            })
            setEmailSent(true)
            toast.success("Invitation resent")
        } catch (e: unknown){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    return <div className={"min-h-screen w-full flex flex-row"}>
        <div className={"min-w-1/2 bg-muted hidden lg:flex border-r border-sidebar"}>

        </div>
        <div className={"flex flex-col justify-center w-full bg-background"}>
            <div className={"flex flex-row w-full justify-center"}>
                { emailSent
                    ? <EmailSentComponent className={'w-2/3'}
                                          isLoading={isLoading}
                                          onResend={onResend}/>
                    : <RegisterForm className={"w-2/3"}
                                    formData={formData}
                                    onRegister={onSubmit}
                                    isLoading={isLoading}/>}
            </div>
        </div>
    </div>
}

export default RegisterPage