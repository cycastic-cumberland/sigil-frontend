import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import {type ChangeEvent, type FC, type SyntheticEvent, useEffect, useRef, useState} from "react";
import type {UserInfoDto} from "@/dto/user/UserInfoDto.ts";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {notifyApiError} from "@/utils/errors.ts";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Eye, EyeOff, KeyRound, RectangleEllipsis} from "lucide-react";
import {
    base64ToUint8Array, createPrivateKey,
    createPublicKey,
    importPrivateKeyFromPem, signWithSHA256withRSAPSS, toEnrollPasswordBasedCipherSigned,
    toPem,
    uint8ArrayToBase64, verifyWithSHA256withRSAPSS
} from "@/utils/cryptography.ts";
import {toast} from "sonner";
import api from "@/api.ts";
import type {CipherDto} from "@/dto/cryptography/CipherDto.ts";
import {getAuth, PasswordValidationText, validatePassword} from "@/utils/auth.ts";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {useConsent} from "@/contexts/ConsentContext.tsx";
import {readFileToString} from "@/utils/format.ts";
import {AllStores, openDb} from "@/utils/db.ts";
import type {Callback} from "@/utils/misc.ts";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from "@/components/ui/drawer.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";

const env = import.meta.env.VITE_FRONTEND_ENV

const verifyKeyPairIntegrity = async (publicKey: CryptoKey, privateKey: CryptoKey) => {
    let data: Uint8Array
    let signature: Uint8Array
    try {
        data = crypto.getRandomValues(new Uint8Array(16))
        signature = await signWithSHA256withRSAPSS(privateKey, data)
    } catch (e){
        console.error(e)
        throw Error("Key integrity verification failed")
    }

    if (!await verifyWithSHA256withRSAPSS(publicKey, data, signature)){
        throw Error("Key integrity verification failed")
    }
}

type PasswordProps = {
    password: string,
    repeatPassword: string
}

const EnrollPassword: FC<{
    isLoading: boolean,
    onSubmit: Callback<string>
}> = ({isLoading, onSubmit}) => {
    const [showPassword, setShowPassword] = useState(false)
    const [showRepeatPassword, setShowRepeatPassword] = useState(false)
    const [formValues, setFormValues] = useState({
        password: '',
        repeatPassword: ''
    } as PasswordProps)

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
        }));
    }

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault()
        if (formValues.password !== formValues.repeatPassword){
            toast.error("Password does not match");
            return
        }
        if (!validatePassword(formValues.password)){
            toast.error(PasswordValidationText)
            return
        }

        onSubmit(formValues.password)
    };

    return <form onSubmit={handleSubmit}>
        <div className="grid gap-2">
            <div className="flex flex-row gap-2">
                <Label className="w-32">Password:</Label>
                <div className="relative flex-1 items-center flex-grow">
                    <Input
                        className="flex-1 border-foreground"
                        value={formValues.password}
                        onChange={handleChange}
                        type={showPassword ? "text" : "password"}
                        id={"password"}
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
            <div className="flex flex-row gap-2">
                <Label className="w-32">Repeat password:</Label>
                <div className="relative flex-1 items-center flex-grow">
                    <Input
                        className="flex-1 border-foreground"
                        value={formValues.repeatPassword}
                        onChange={handleChange}
                        type={showRepeatPassword ? "text" : "password"}
                        id={"repeatPassword"}
                        disabled={isLoading}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowRepeatPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
                        tabIndex={-1}
                    >
                        {showRepeatPassword ? <EyeOff className="h-5 w-5 text-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                    </button>
                </div>
            </div>
            <Button disabled={isLoading}
                    type={"submit"}
                    className={'flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                {isLoading ? <Spinner/> : <RectangleEllipsis/>}
                Enroll password
            </Button>
        </div>
    </form>
}

const SelfDetailsPage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [enrollPasswordEnabled, setEnrollPasswordEnabled] = useState(false)
    const [user, setUser] = useState(null as UserInfoDto | null)
    const {setUserPrivateKey, getUserInfo, generateWebAuthnPrfKey, getEnvelop, invalidateAllSessions, localLogout} = useAuthorization()
    const {requireAgreement, requireDecryption, requireFiles} = useConsent()
    const agreementRef = useRef(null as Promise<boolean> | null)
    const isDesktop = useMediaQuery("(min-width: 768px)")

    useEffect(() => {
        (async () => {
           try {
               setIsLoading(true)
               const u = await getUserInfo();
               setUser(u)
           } catch (e){
               notifyApiError(e)
           } finally {
               setIsLoading(false)
           }
        })()
    }, []);

    const attemptEnrollPassword = async (password: string) => {
        try {
            setIsLoading(true)
            const privateKey = await requireDecryption()
            const passwordCredential = await toEnrollPasswordBasedCipherSigned(password, privateKey)

            await api.post('auth/password/enroll', passwordCredential)
            setEnrollPasswordEnabled(false)
            toast.success("Password enrolled")
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }

        setUser(await getUserInfo(true))
    }

    const enrollPasskey = async (u: UserInfoDto, pkcs8: Uint8Array) => {
        const {encryptionKey, rawId, salt, transports} = await generateWebAuthnPrfKey(u)
        const nonce = crypto.getRandomValues(new Uint8Array(12));
        const encryptedPkcs8 = new Uint8Array(await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: nonce },
            encryptionKey,
            pkcs8
        ))

        const privateKey = await createPrivateKey(pkcs8, true)
        const cipherSignature = await signWithSHA256withRSAPSS(privateKey, encryptedPkcs8)
        await api.post('auth/webauthn/enroll', {
            credentialId: uint8ArrayToBase64(rawId),
            salt: uint8ArrayToBase64(salt),
            transports,
            signatureAlgorithm: 'SHA256withRSA/PSS',
            signature: uint8ArrayToBase64(cipherSignature),
            wrappedUserKey: {
                decryptionMethod: "WEBAUTHN_KEY",
                iv: uint8ArrayToBase64(nonce),
                cipher: uint8ArrayToBase64(encryptedPkcs8)
            } as CipherDto,
        })

        setUser(await getUserInfo(true))
    }

    const attemptEnrollPasskey = async () => {
        try {
            const privateKey = await requireDecryption()
            setIsLoading(true)

            const envelop = await getEnvelop();
            if (!envelop.passwordCipher){
                toast.error("Password not enabled")
                return
            }
            const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey)
            await enrollPasskey(user!, new Uint8Array(pkcs8))

            toast.success("Passkey enrolled")
        } catch (e: unknown) {
            if (e instanceof Error){
                toast.error(e.message)
            } else {
                toast.error("Failed to unlock user's session")
            }
        } finally {
            setIsLoading(false)
        }
    }

    const invalidateSessions = async () => {
        try {
            setIsLoading(true)
            const authInfo = getAuth()
            if (!authInfo){
                toast.error("A serious error has occurred")
                return
            }
            await invalidateAllSessions(authInfo.userId)
            localLogout()
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const exportPrivateKey = async () => {
        if (!user){
            toast.error("Unreachable")
            return
        }
        try {
            setIsLoading(true)
            const key = await requireDecryption()
            const pem = await toPem(key)

            const blob = new Blob([pem], { type: "application/x-pem-file" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${user.firstName} ${user.lastName}.pem`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const importPrivateKey = async () => {
        if (!user){
            toast.error("Unreachable")
            return
        }
        try {
            setIsLoading(true)
            const files = await requireFiles({
                accept: "application/x-pem-file",
            })

            const pem = await readFileToString(files[0])
            const privateKey = await importPrivateKeyFromPem(pem ?? '', true)

            const publicKey = await createPublicKey(base64ToUint8Array(user.publicRsaKey), true)
            await verifyKeyPairIntegrity(publicKey, privateKey)

            const db = await openDb()
            await db.addObject(AllStores.DebugKeys, {
                id: user.id,
                key: pem
            })
            setUserPrivateKey(privateKey)
            toast.success("Key enrolled")
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const wipePrivateKeys = async () => {
        try {
            if (!await requireAgreement({
                acceptText: "Wipe",
                title: "Wipe all local private keys?",
                message: "Automatic unlock will be disabled",
                destructive: true,
                ref: agreementRef
            })){
                return
            }
            setIsLoading(true)
            const db = await openDb()
            await db.clearStore(AllStores.DebugKeys)
            window.location.reload()
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    return <MainLayout>
        {enrollPasswordEnabled && (isDesktop ? <Dialog open={enrollPasswordEnabled} onOpenChange={setEnrollPasswordEnabled}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enroll password</DialogTitle>
                    <DialogDescription>
                        {PasswordValidationText}
                    </DialogDescription>
                </DialogHeader>
                <div className={"w-full"}>
                    <EnrollPassword isLoading={isLoading} onSubmit={attemptEnrollPassword}/>
                </div>
            </DialogContent>
        </Dialog> : <Drawer open={enrollPasswordEnabled} onOpenChange={setEnrollPasswordEnabled}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Enroll password</DrawerTitle>
                    <DrawerDescription>
                        {PasswordValidationText}
                    </DrawerDescription>
                </DrawerHeader>
                <div className={"w-full px-3 pb-3"}>
                    <EnrollPassword isLoading={isLoading} onSubmit={attemptEnrollPassword}/>
                </div>
            </DrawerContent>
        </Drawer>)}
        { !user
            ? <div className={'w-full flex flex-grow'}>
                <FullSizeSpinner/>
            </div>
            : <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-foreground font-bold"}>
                    User details
                </Label>
            </div>
            <div className={"my-3 w-full"}>
                <div className={"lg:w-1/2 text-foreground flex flex-col gap-2"}>
                    <form>
                        <div className="grid gap-2">
                            <div className="flex flex-row gap-2">
                                <Label className="w-32">Email:</Label>
                                <Input
                                    className="flex-1 border-foreground"
                                    value={user.email}
                                    id="email"
                                    required
                                    disabled={true}
                                />
                            </div>
                            <div className="flex flex-row gap-2">
                                <Label className="w-32">First name:</Label>
                                <Input
                                    className="flex-1 border-foreground"
                                    value={user.firstName}
                                    id="firstName"
                                    required
                                    disabled={true}
                                />
                            </div>
                            <div className="flex flex-row gap-2">
                                <Label className="w-32">Last name:</Label>
                                <Input
                                    className="flex-1 border-foreground"
                                    value={user.lastName}
                                    id="lastName"
                                    required
                                    disabled={true}
                                />
                            </div>
                            <div className="flex flex-row gap-2">
                                <Label className="w-32">Joined at:</Label>
                                <Input
                                    className="flex-1 border-foreground"
                                    value={new Date(user.joinedAt).toString()}
                                    id="joinedAt"
                                    disabled={true}
                                />
                            </div>
                            <div className="flex flex-row gap-2">
                                <Label className="w-32">Password:</Label>
                                <Button className="flex-1 border-foreground cursor-pointer"
                                        variant={"outline"}
                                        type={"button"}
                                        onClick={() => setEnrollPasswordEnabled(true)}
                                        disabled={isLoading}>
                                    <RectangleEllipsis/>
                                    {user.hasPasswordCredential ? 'Update password' : 'Enroll password'}
                                </Button>
                            </div>
                            <div className="flex flex-row gap-2">
                                <Label className="w-32">Passkey:</Label>
                                <Button className="flex-1 border-foreground cursor-pointer"
                                        variant={"outline"}
                                        type={"button"}
                                        onClick={attemptEnrollPasskey}
                                        disabled={isLoading}>
                                    <KeyRound/>
                                    {user.hasWebAuthnCredential ? 'Re-enroll passkey' : 'Enable now'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            <div className={"my-2"}>
                <Label className={"text-2xl text-destructive font-bold"}>
                    Danger zone
                </Label>
            </div>
                <div className={"my-3 w-full"}>
                    <div className={"lg:w-1/2 text-foreground flex flex-col gap-2"}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button className={"cursor-pointer bg-destructive text-background border-destructive border-1 hover:bg-background hover:text-destructive"}
                                        onClick={invalidateSessions}>
                                    Invalidate all sessions
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Log out all active sessions</p>
                            </TooltipContent>
                        </Tooltip>
                        {env === 'develop' && <>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button className={"cursor-pointer "}
                                            variant={'outline'}
                                            onClick={exportPrivateKey}>
                                        Export private key
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Export your current private key as PEM format</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button className={"cursor-pointer "}
                                            variant={'outline'}
                                            onClick={importPrivateKey}>
                                        Import private key
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Import and persist your private key locally (accept PEM format)</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button className={"cursor-pointer "}
                                            variant={'outline'}
                                            onClick={wipePrivateKeys}>
                                        Wipe local private keys
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Remove all local private keys</p>
                                </TooltipContent>
                            </Tooltip>
                        </>}
                    </div>
                </div>
        </div> }
    </MainLayout>
}

export default SelfDetailsPage