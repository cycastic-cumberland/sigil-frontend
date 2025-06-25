import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import {type FC, type HTMLAttributes, type SyntheticEvent, useMemo, useRef, useState} from "react"
import {cn} from "@/lib/utils.ts";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {useLocation, useNavigate} from "react-router";
import type {AxiosError} from "axios";

const useQuery = () => {
    const { search } = useLocation();

    return useMemo(() => new URLSearchParams(search), [search]);
}

const UserAuthForm: FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [errorType, setErrorType] = useState("")
    const { signInWithEmailAndPassword } = useAuthorization()
    const navigate = useNavigate()
    const emailRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null);
    const query = useQuery()

    const onSubmit = async (event: SyntheticEvent) => {
        event.preventDefault()
        setErrorType("")
        setIsLoading(true)

        try {
            const email = emailRef.current?.value;
            const password = passwordRef.current?.value;
            if (!email){
                setErrorType("Email is required")
                return
            }
            if (!password){
                setErrorType("Password is required")
                return
            }
            await signInWithEmailAndPassword(email, password);
            if (query.get('redirect')){
                navigate(`${query.get('redirect')}`)
            } else {
                navigate('/')
            }
        } catch (e){
            // @ts-ignore
            setErrorType((e as AxiosError).response?.data?.message ?? "")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={cn("grid gap-6", className)} {...props}>
            <form onSubmit={onSubmit}>
                <div className="grid gap-2">
                    <div className={"flex flex-col gap-2 text-center"}>
                        <h1 className={"text-2xl font-semibold tracking-tight text-secondary"}>
                            Sign into PortfolioToolkit
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
                            ref={emailRef}
                            placeholder="Email"
                            className={"text-secondary"}
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect="off"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label className="sr-only" htmlFor="password">
                            Password
                        </Label>
                        <Input
                            id="password"
                            ref={passwordRef}
                            className={"text-secondary"}
                            placeholder="Password"
                            type="password"
                            disabled={isLoading}
                        />
                    </div>
                    <Button disabled={isLoading} className={`hover:text-secondary cursor-pointer ${errorType ? "bg-destructive text-secondary" : "bg-secondary text-primary"}`}>
                        {isLoading && (
                            <Spinner />
                        )}
                        { errorType ? errorType : "Sign In with Email" }
                    </Button>
                </div>
            </form>
        </div>
    )
}

const LoginPage = () => {
    return <>
        <div className={"min-h-screen w-full flex flex-row"}>
            <div className={"min-w-1/2 bg-primary hidden lg:flex border-r border-muted-foreground"}>

            </div>
            <div className={"flex flex-col justify-center w-full bg-foreground"}>
                <div className={"flex flex-row w-full justify-center"}>
                    <UserAuthForm className={"w-2/3"}/>
                </div>
            </div>
        </div>
    </>
}

export default LoginPage;