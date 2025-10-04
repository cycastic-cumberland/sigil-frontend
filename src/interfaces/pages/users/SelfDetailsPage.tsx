import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import {useEffect, useRef, useState} from "react";
import type {UserInfoDto} from "@/dto/user/UserInfoDto.ts";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {notifyApiError} from "@/utils/errors.ts";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {KeyRound} from "lucide-react";
import {
    base64ToUint8Array,
    createPublicKey,
    decryptWithPrivateKey,
    encryptWithPublicKey,
    importPrivateKeyFromPem,
    toPem,
    uint8ArrayToBase64
} from "@/utils/cryptography.ts";
import {toast} from "sonner";
import api from "@/api.ts";
import type {CipherDto} from "@/dto/cryptography/CipherDto.ts";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from "@/components/ui/drawer.tsx";
import {getAuth} from "@/utils/auth.ts";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {PasswordBasedPrivateKeyDecryptor} from "@/interfaces/components/PrivateKeyDecryptor.tsx";
import {useConsent} from "@/contexts/ConsentContext.tsx";
import {readFileToString} from "@/utils/format.ts";
import {AllStores, openDb} from "@/utils/db.ts";

const env = import.meta.env.VITE_FRONTEND_ENV

const verifyKeyPairIntegrity = async (publicKey: CryptoKey, privateKey: CryptoKey) => {
    let data: Uint8Array
    let decrypted: Uint8Array
    try {
        data = crypto.getRandomValues(new Uint8Array(16))
        const encrypted = await encryptWithPublicKey(publicKey, data)
        decrypted = await decryptWithPrivateKey(privateKey, encrypted)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e){
        throw Error("Key integrity verification failed")
    }

    if (!data.every((value, index) => value === decrypted[index])){
        throw Error("Key integrity verification failed")
    }
}


const SelfDetailsPage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [enrollPasskeyDialog, setEnrollPasskeyDialog] = useState(false)
    const [user, setUser] = useState(null as UserInfoDto | null)
    const {setUserPrivateKey, getUserInfo, generateWebAuthnPrfKey, transientDecryptPrivateKey, getEnvelop, invalidateAllSessions, localLogout} = useAuthorization()
    const {requireAgreement, requireDecryption, requireFiles} = useConsent()
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const agreementRef = useRef(null as Promise<boolean> | null)

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

    const enrollPasskey = async (u: UserInfoDto, pkcs8: Uint8Array) => {
        const {encryptionKey, rawId, salt, transports} = await generateWebAuthnPrfKey(u)
        const nonce = crypto.getRandomValues(new Uint8Array(12));
        const encryptedPkcs8 = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: nonce },
            encryptionKey,
            pkcs8
        )

        await api.post('auth/webauthn/enroll', {
            credentialId: uint8ArrayToBase64(rawId),
            salt: uint8ArrayToBase64(salt),
            transports,
            wrappedUserKey: {
                decryptionMethod: "WEBAUTHN_KEY",
                iv: uint8ArrayToBase64(nonce),
                cipher: uint8ArrayToBase64(new Uint8Array(encryptedPkcs8))
            } as CipherDto,
        })

        setUser(await getUserInfo(true))
    }

    const attemptEnrollPasskey = async (password: string) => {
        try {
            setIsLoading(true)

            const envelop = await getEnvelop();
            if (!envelop.passwordCipher){
                toast.error("Password not enabled")
                return
            }
            const pkcs8 = await transientDecryptPrivateKey(password, envelop.passwordCipher)
            await enrollPasskey(user!, pkcs8)
            setEnrollPasskeyDialog(false)
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
            const privateKey = await importPrivateKeyFromPem(pem ?? '')

            const publicKey = await createPublicKey(base64ToUint8Array(user.publicRsaKey), false)
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
        { isDesktop ? <Dialog open={enrollPasskeyDialog} onOpenChange={setEnrollPasskeyDialog} >
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Verification required</DialogTitle>
                    <DialogDescription>Reenter your password to proceed.</DialogDescription>
                </DialogHeader>
                <PasswordBasedPrivateKeyDecryptor isLoading={isLoading} onSave={attemptEnrollPasskey}/>
            </DialogContent>
        </Dialog> : <Drawer open={enrollPasskeyDialog} onOpenChange={setEnrollPasskeyDialog}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Verification required</DrawerTitle>
                    <DrawerDescription>Reenter your password to proceed.</DrawerDescription>
                </DrawerHeader>
                <div className={"p-5"}>
                    <PasswordBasedPrivateKeyDecryptor isLoading={isLoading} onSave={attemptEnrollPasskey}/>
                </div>
            </DrawerContent>
        </Drawer> }
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
                                <Label className="w-32">Passkey enabled:</Label>
                                { user.hasWebAuthnCredential
                                    ? <Input className="flex-1 border-foreground"
                                             value={"Passkey enabled"}
                                             id="hasWebAuthnCredential"
                                             disabled={true}/>
                                    : <Button className="flex-1 border-foreground cursor-pointer"
                                              variant={"outline"}
                                              type={"button"}
                                              onClick={() => setEnrollPasskeyDialog(true)}
                                              disabled={isLoading}>
                                        <KeyRound/>
                                        Enable now
                                    </Button> }
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