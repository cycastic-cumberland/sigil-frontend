import {type ChangeEvent, type FC, type SyntheticEvent, useEffect, useState} from "react";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {toast} from "sonner";
import {notifyApiError} from "@/utils/errors.ts";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {KeyRound, RectangleEllipsis} from "lucide-react";

export const PasswordBasedPrivateKeyDecryptor: FC<{
    isLoading: boolean,
    onSave: (password: string) => void,
}> = ({ isLoading, onSave }) => {
    const [password, setPassword] = useState("")

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        onSave(password)
    };

    const handleChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { value } = e.target;
        setPassword(value)
    };

    return <div className={"w-full"}>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-2">
                <div className="flex flex-row gap-2">
                    <Label className="w-32">Password:</Label>
                    <Input
                        className="flex-1 border-foreground"
                        value={password}
                        onChange={handleChange}
                        type={"password"}
                        required
                        disabled={isLoading}
                    />
                </div>
                <Button disabled={isLoading} type={"submit"} className={'flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                    { isLoading ? <Spinner/> : <RectangleEllipsis/> }
                    Unlock with Email & Password
                </Button>
            </div>
        </form>
    </div>
}

export const PasskeyBasedPrivateKeyDecryptor: FC<{
    isLoading: boolean,
    setIsLoading: (b: boolean) => void,
    onSuccess?: () => void,
}> = ({ isLoading, setIsLoading, onSuccess }) => {
    const { decryptWithWebAuthn } = useAuthorization()

    const onSubmit = async () => {
        try {
            setIsLoading(true)
            await decryptWithWebAuthn()
            if (onSuccess) {
                onSuccess()
            }
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

    return <div className={"w-full"}>
        <div className="grid gap-2">
            <Button disabled={isLoading}
                    onClick={onSubmit}
                    className={"hover:text-foreground cursor-pointer bg-foreground text-background"}>
                {isLoading ? <Spinner/> : <KeyRound/> }
                Unlock with Passkey
            </Button>
        </div>
    </div>
}

export const PrivateKeyDecryptor: FC<{
    isLoading: boolean,
    setIsLoading: (b: boolean) => void,
    onSuccess?: () => void,
}> = ({ isLoading, setIsLoading, onSuccess }) => {
    const [hasPassword, setHasPassword] = useState(false)
    const [hasPasskey, setHasPasskey] = useState(false)
    const [isPassword, setIsPassword] = useState(null as boolean | null)
    const {getEnvelop, decryptPrivateKey} = useAuthorization()

    useEffect(() => {
        (async () => {
            try {
                setIsLoading(true)

                const envelop = await getEnvelop()
                setHasPasskey(!!envelop.webAuthnCipher)
                setHasPassword(!!envelop.passwordCipher)
                if (envelop.webAuthnCipher){
                    setIsPassword(false)
                    return
                }
                if (envelop.passwordCipher){
                    setIsPassword(true)
                    return
                }

                toast.error("No decryption method found")
            } catch (e){
                notifyApiError(e)
            } finally {
                setIsLoading(false)
            }
        })()
    }, []);

    const onSubmit = async (password: string) => {
        try {
            setIsLoading(true)

            await decryptPrivateKey(password)
            if (onSuccess){
                onSuccess()
            }
        } catch (e: unknown) {
            if (e instanceof Error){
                toast.error(e.message)
            } else {
                toast.error("Failed to unlock user's session")
            }
        } finally {
            setIsLoading(false)
        }
    };

    if (isPassword === null){
        return
    }

    return <div className={"w-full flex flex-col gap-2"}>
        { isPassword
            ? <PasswordBasedPrivateKeyDecryptor isLoading={isLoading}
                                                onSave={onSubmit}/>
            : <PasskeyBasedPrivateKeyDecryptor isLoading={isLoading}
                                               setIsLoading={setIsLoading}
                                               onSuccess={onSuccess}/> }
        { isPassword
            ? (hasPasskey && <Button type={"button"}
                                     disabled={isLoading}
                                     onClick={() => setIsPassword(false)}
                                     className={"hover:text-background hover:bg-foreground cursor-pointer bg-background text-foreground shadow-none"}>
                <KeyRound/>
                Unlock with Passkey
            </Button>)
            : (hasPassword && <Button type={"button"}
                                      disabled={isLoading}
                                      onClick={() => setIsPassword(true)}
                                      className={"hover:text-background hover:bg-foreground cursor-pointer bg-background text-foreground shadow-none"}>
                <RectangleEllipsis/>
                Unlock with Email & Password
            </Button>) }
    </div>
}

