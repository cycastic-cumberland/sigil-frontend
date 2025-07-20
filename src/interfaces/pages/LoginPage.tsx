import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import {type ChangeEvent, type FC, type HTMLAttributes, type SyntheticEvent, useEffect, useState} from "react"
import {cn} from "@/lib/utils.ts";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {useNavigate, useSearchParams} from "react-router";
import {toast} from "sonner";
import {notifyApiError} from "@/utils/errors.ts";
import {useQuery} from "@/utils/path.ts";
import {KeyRound, RectangleEllipsis} from "lucide-react";

const PasskeyAuthForm: FC<{
    isLoading: boolean,
    setIsLoading: (l: boolean) => void,
    email: string,
    setEmail: (e: string) => void,
    toggleAuthType: () => void,
}> = ({ isLoading, setIsLoading, email, setEmail, toggleAuthType }) => {
    const { signInWithEmailAndPasskey } = useAuthorization()
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
            await signInWithEmailAndPasskey(email)
            redirect()
        } catch (e){
            if (e instanceof Error && e.name === "NotAllowedError"){
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
    const { signInWithEmailAndPassword } = useAuthorization()
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
        try {
            setIsLoading(true)
            await signInWithEmailAndPassword(formValues.email, formValues.password)
            redirect()
        } catch (e){
            notifyApiError(e)
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
                <Input
                    id="password"
                    value={formValues.password}
                    onChange={handleChange}
                    className={"text-foreground"}
                    placeholder="Password"
                    type="password"
                    disabled={isLoading}
                    required
                />
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
        <div className={cn("grid gap-6", className)} {...props}>
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
        </div>
    )
}

const LoginPage = () => {
    const [searchParams] = useSearchParams()
    const [errorMessage, setErrorMessage] = useState(null as string | null)
    const navigate = useNavigate()

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
                <div className={"flex flex-row w-full justify-center"}>
                    <UserAuthForm className={"w-2/3"}/>
                </div>
            </div>
        </div>
    </>
}

export default LoginPage;