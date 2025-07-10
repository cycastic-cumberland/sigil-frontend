import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import {type FC, type HTMLAttributes, type SyntheticEvent, useEffect, useMemo, useRef, useState} from "react"
import {cn} from "@/lib/utils.ts";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {Link, useLocation, useNavigate, useSearchParams} from "react-router";
import {toast} from "sonner";
import {notifyApiError} from "@/utils/errors.ts";

const useQuery = () => {
    const { search } = useLocation();

    return useMemo(() => new URLSearchParams(search), [search]);
}

const UserAuthForm: FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const { signInWithEmailAndPassword } = useAuthorization()
    const navigate = useNavigate()
    const emailRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null);
    const query = useQuery()

    const onSubmit = async (event: SyntheticEvent) => {
        event.preventDefault()
        setIsLoading(true)

        try {
            const email = emailRef.current?.value;
            const password = passwordRef.current?.value;
            if (!email){
                toast.error("Email is required")
                return
            }
            if (!password){
                toast.error("Password is required")
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
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={cn("grid gap-6", className)} {...props}>
            <form onSubmit={onSubmit}>
                <div className="grid gap-2">
                    <div className={"flex flex-col gap-2 text-center"}>
                        <h1 className={"text-2xl font-semibold tracking-tight text-foreground"}>
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
                            className={"text-foreground"}
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
                            className={"text-foreground"}
                            placeholder="Password"
                            type="password"
                            disabled={isLoading}
                        />
                    </div>
                    <Button disabled={isLoading}
                            type={"submit"}
                            className={"hover:text-foreground cursor-pointer bg-foreground text-background"}>
                        {isLoading && (
                            <Spinner/>
                        )}
                        Sign In with Email
                    </Button>
                    <div className="flex items-center">
                        <hr className="flex-grow border-t border-muted-foreground"/>
                        <span className="mx-2 text-sm text-muted-foreground">or</span>
                        <hr className="flex-grow border-t border-muted-foreground"/>
                    </div>
                    <Button disabled={isLoading}
                            className={'hover:text-background hover:bg-foreground cursor-pointer bg-background text-foreground shadow-none'}
                            asChild>
                        <Link to={'/register'}>
                            Register with Email
                        </Link>
                    </Button>
                </div>
            </form>
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