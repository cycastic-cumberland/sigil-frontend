import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import {type ChangeEvent, type FC, type HTMLAttributes, type SyntheticEvent, useEffect, useState} from "react"
import {cn} from "@/lib/utils.ts";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {Link, useNavigate, useSearchParams} from "react-router";
import {toast} from "sonner";
import {ExceptionCodes, notifyApiError} from "@/utils/errors.ts";
import {useQuery} from "@/utils/path.ts";
import {Eye, EyeOff, KeyRound, RectangleEllipsis} from "lucide-react";
import axios from "axios";
import {usePageTitle} from "@/hooks/use-page-title.ts";

const isRegistrationInProgress = (e: unknown) =>
    (axios.isAxiosError(e) && (e.response?.data?.exceptionCode ?? null) === ExceptionCodes.registrationInProgress)

const PasskeyAuthForm: FC<{
    isLoading: boolean,
    setIsLoading: (l: boolean) => void,
    email: string,
    setEmail: (e: string) => void,
    toggleAuthType: () => void,
}> = ({ isLoading, setIsLoading, email, setEmail, toggleAuthType }) => {
    const { signInWithEmailAndPasskey, resendInvitation } = useAuthorization()
    const navigate = useNavigate()
    const query = useQuery()

    const redirect = () => {
        if (query.get('redirect')){
            navigate(`${query.get('redirect')}`)
        } else {
            navigate('/')
        }
    }

    const handleChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { value } = e.target;
        setEmail(value)
    };

    const onSubmit = async (e: SyntheticEvent) => {
        e.preventDefault()
        try {
            setIsLoading(true)
            await signInWithEmailAndPasskey(email.trim())
            redirect()
        } catch (e){
            if (isRegistrationInProgress(e)){
                toast("Registration in progress", {
                    action: {
                        label: "Resend invitation",
                        onClick: async () => {
                            try {
                                setIsLoading(true)
                                await resendInvitation(email)
                                toast.success("Invitation resent")
                            } catch (e){
                                notifyApiError(e)
                            } finally {
                                setIsLoading(false)
                            }
                        }
                    }
                })
            } else if (e instanceof Error && e.name === "NotAllowedError"){
                toast.error("Operation not allowed")
            } else {
                notifyApiError(e)
            }
        } finally {
            setIsLoading(false)
        }
    }

    return <form onSubmit={onSubmit}>
        <div className="grid gap-2">
            <div className={"flex flex-col gap-2 text-center"}>
                <h1 className={"text-2xl font-semibold tracking-tight text-foreground"}>
                    Sign into Sigil
                </h1>
                <p className={"text-muted-foreground text-sm"}>
                    Sign in with your passkey
                </p>
            </div>
            <div className="grid gap-1">
                <Label className="sr-only" htmlFor="email">
                    Email
                </Label>
                <Input
                    id="email"
                    value={email}
                    onChange={handleChange}
                    placeholder="Email"
                    className={"text-foreground"}
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading}
                    required
                />
            </div>
            <Button disabled={isLoading}
                    className={"hover:text-foreground cursor-pointer bg-foreground text-background"}>
                {isLoading ? <Spinner/> : <KeyRound/> }
                Sign In with Passkey
            </Button>
            <Button type={"button"}
                    disabled={isLoading}
                    onClick={toggleAuthType}
                    className={"hover:text-background hover:bg-foreground cursor-pointer bg-background text-foreground shadow-none"}>
                <RectangleEllipsis/>
                Sign In with Email & Password
            </Button>
        </div>
    </form>
}

const PasswordAuthForm: FC<{
    isLoading: boolean,
    setIsLoading: (l: boolean) => void,
    email: string,
    setEmail: (e: string) => void,
    toggleAuthType: () => void,
}> = ({ isLoading, setIsLoading, email, setEmail, toggleAuthType }) => {
    const [formValues, setFormValues] = useState({ email: '', password: '' })
    const [showPassword, setShowPassword] = useState(false)
    const { signInWithEmailAndPassword, resendInvitation } = useAuthorization()
    const navigate = useNavigate()
    const query = useQuery()

    useEffect(() => {
        setFormValues((prev) => ({
            ...prev,
            email
        }))
    }, [email]);

    const redirect = () => {
        if (query.get('redirect')){
            navigate(`${query.get('redirect')}`)
        } else {
            navigate('/')
        }
    }

    const handleChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { id, value } = e.target;
        if (id === 'email'){
            setEmail(value)
        }

        setFormValues((prev) => ({
            ...prev,
            [id]: value
        }))
    };

    const onSubmit = async (e: SyntheticEvent) => {
        e.preventDefault()
        const email = formValues.email.trim()
        try {
            setIsLoading(true)
            await signInWithEmailAndPassword(email, formValues.password)
            redirect()
        } catch (e){
            if (isRegistrationInProgress(e)){
                toast("Registration in progress", {
                    action: {
                        label: "Resend invitation",
                        onClick: async () => {
                            try {
                                setIsLoading(true)
                                await resendInvitation(email)
                                toast.success("Invitation resent")
                            } catch (e){
                                notifyApiError(e)
                            } finally {
                                setIsLoading(false)
                            }
                        }
                    }
                })
            } else{
                notifyApiError(e)
            }
        } finally {
            setIsLoading(false)
        }
    }

    return <form onSubmit={onSubmit}>
        <div className="grid gap-2">
            <div className={"flex flex-col gap-2 text-center"}>
                <h1 className={"text-2xl font-semibold tracking-tight text-foreground"}>
                    Sign into Sigil
                </h1>
                <p className={"text-muted-foreground text-sm"}>
                    Enter your email and password below
                </p>
            </div>
            <div className="grid gap-1">
                <Label className="sr-only" htmlFor="email">
                    Email
                </Label>
                <Input
                    id="email"
                    value={formValues.email}
                    onChange={handleChange}
                    placeholder="Email"
                    className={"text-foreground"}
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading}
                    required
                />
            </div>
            <div className="grid gap-1">
                <Label className="sr-only" htmlFor="password">
                    Password
                </Label>
                <div className="relative flex-1 items-center flex-grow">
                    <Input
                        id="password"
                        value={formValues.password}
                        onChange={handleChange}
                        className={"text-foreground"}
                        placeholder="Password"
                        type={showPassword ? "text" : "password"}
                        disabled={isLoading}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5 text-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                    </button>
                </div>
            </div>
            <Button disabled={isLoading}
                    className={"hover:text-foreground cursor-pointer bg-foreground text-background"}>
                {isLoading ? <Spinner/> : <RectangleEllipsis/> }
                Sign In with Email & Password
            </Button>
            <Button type={"button"}
                    disabled={isLoading}
                    onClick={toggleAuthType}
                    className={"hover:text-background hover:bg-foreground cursor-pointer bg-background text-foreground shadow-none"}>
                <KeyRound/>
                Sign In with Passkey
            </Button>
        </div>
    </form>
}

const UserAuthForm: FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [email, setEmail] = useState('')

    return (
        <div className={cn("grid gap-1", className)} {...props}>
            { showPassword
                ? <PasswordAuthForm isLoading={isLoading}
                                    setIsLoading={setIsLoading}
                                    email={email}
                                    setEmail={setEmail}
                                    toggleAuthType={() => setShowPassword(false)}/>
                : <PasskeyAuthForm isLoading={isLoading}
                                   setIsLoading={setIsLoading}
                                   email={email}
                                   setEmail={setEmail}
                                   toggleAuthType={() => setShowPassword(true)}/>}
            <div className="flex items-center">
                <hr className="flex-grow border-t border-muted-foreground"/>
                <span className="mx-2 text-sm text-muted-foreground">or</span>
                <hr className="flex-grow border-t border-muted-foreground"/>
            </div>
            <Button disabled={isLoading}
                    className={'hover:text-background hover:bg-foreground cursor-pointer bg-background text-foreground shadow-none'}
                    asChild>
                <Link to={'/register'}>
                    Register
                </Link>
            </Button>
        </div>
    )
}

const LoginPage = () => {
    const [searchParams] = useSearchParams()
    const [errorMessage, setErrorMessage] = useState(null as string | null)
    const navigate = useNavigate()

    usePageTitle('Login')

    useEffect(() => {
        setErrorMessage(searchParams.get('error'))
    }, [searchParams]);

    useEffect(() => {
        if (errorMessage){
            toast.error(errorMessage)
            navigate('/login')
        }
    }, [errorMessage]);

    return <>
        <div className={"min-h-screen w-full flex flex-row"}>
            <div className={"min-w-1/2 bg-muted hidden lg:flex border-r border-sidebar"}>

            </div>
            <div className={"flex flex-col justify-center w-full bg-background"}>
                <div className={"flex flex-grow"}/>
                <div className={"flex flex-row w-full justify-center"}>
                    <UserAuthForm className={"w-2/3"}/>
                </div>
                <div className={"flex flex-grow"}/>
                <Link to={"https://github.com/cycastic-cumberland/sigil-backend.git"} target={"_blank"} className={"text-center text-xs mb-2 underline"}>
                    Github
                </Link>
            </div>
        </div>
    </>
}

export default LoginPage;