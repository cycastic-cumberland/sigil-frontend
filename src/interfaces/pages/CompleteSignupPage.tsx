import {useNavigate, useSearchParams} from "react-router";
import {type ChangeEvent, type FC, type SyntheticEvent, useEffect, useState} from "react";
import {notifyApiError} from "@/utils/errors.ts";
import axios from "axios";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import {toast} from "sonner";
import api, {BACKEND_AUTHORITY} from "@/api.ts";
import {
    deriveArgon2idKey,
    type EncodedKeyPair,
    generateEncodedRsaOaepWithSha256KeyPair,
    uint8ArrayToBase64
} from "@/utils/cryptography.ts";
import type {BlockingFC, Callback} from "@/utils/misc.ts";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {Eye, EyeOff, KeyRound, RectangleEllipsis} from "lucide-react";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import type {WebAuthnCredentialDto} from "@/dto/webauthn.ts";
import type {CipherDto} from "@/dto/CipherDto.ts";
import {validatePassword} from "@/utils/auth.ts";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";

type InvitationProbeResultDto = {
    email: string
}

type BaseCompleteUserRegistrationFormDto = {
    firstName: string,
    lastName: string,
    publicRsaKey: string
}

type PasswordBasedCompleteUserRegistrationFormDto = BaseCompleteUserRegistrationFormDto & {
    password: string,
    repeatPassword: string
}

type BaseCompletionFormProps = BlockingFC & {
    submissionUrl: string,
    email: string,
    form: BaseCompleteUserRegistrationFormDto,
    privateKey?: Uint8Array
}

interface CommonInfoInputProps<T extends BaseCompleteUserRegistrationFormDto> {
    isLoading: boolean,
    formValues: T,
    setFormValues: Callback<Callback<T, T>>
}

const CommonInfoInput = <T extends BaseCompleteUserRegistrationFormDto>({
    isLoading,
    formValues,
    setFormValues
}: CommonInfoInputProps<T>) => {
    const handleChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { id, value } = e.target;
        setFormValues((prev) => ({
            ...prev,
            [id]: value,
        }));
    };

    return <>
        <div className="grid grid-cols-2 gap-2">
            <div>
                <Label className="sr-only" htmlFor="firstName">First Name</Label>
                <Input
                    id="firstName"
                    placeholder="First Name"
                    value={formValues.firstName}
                    onChange={handleChange}
                    className="text-foreground"
                    disabled={isLoading}
                    required
                />
            </div>
            <div>
                <Label className="sr-only" htmlFor="lastName">Last Name</Label>
                <Input
                    id="lastName"
                    placeholder="Last Name"
                    value={formValues.lastName}
                    onChange={handleChange}
                    className="text-foreground"
                    disabled={isLoading}
                    required
                />
            </div>
        </div>
    </>
}

const PasskeyBasedCompletionForm: FC<BaseCompletionFormProps & {
    onSwitchToPassword: Callback<BaseCompleteUserRegistrationFormDto>,
}> = ({ submissionUrl, email, isLoading, setIsLoading, form, privateKey, onSwitchToPassword }) => {
    const {generateWebAuthnPrfKey} = useAuthorization()
    const navigate = useNavigate()
    const [formValues, setFormValues] = useState({ ...form })

    useEffect(() => {
        setFormValues({...form})
    }, [form]);

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        if (!privateKey){
            toast.error("Generating encryption key, please retry later")
            return
        }

        try {
            setIsLoading(true)

            const {encryptionKey, rawId, salt, transports} = await generateWebAuthnPrfKey({
                email,
                firstName: formValues.firstName,
                lastName: formValues.lastName
            })
            const nonce = crypto.getRandomValues(new Uint8Array(12));
            const encryptedPkcs8 = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv: nonce },
                encryptionKey,
                privateKey
            )
            const webAuthnCredential: WebAuthnCredentialDto = {
                credentialId: uint8ArrayToBase64(rawId),
                salt: uint8ArrayToBase64(salt),
                transports,
                wrappedUserKey: {
                    decryptionMethod: "WEBAUTHN_KEY",
                    iv: uint8ArrayToBase64(nonce),
                    cipher: uint8ArrayToBase64(new Uint8Array(encryptedPkcs8))
                } as CipherDto,
            }
            await api.post(submissionUrl, {
                ...formValues,
                webAuthnCredential
            })

            toast.success("Registration completed, please sign in again")
            navigate("/login")
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    };

    return <form onSubmit={handleSubmit}>
        <div className="grid gap-2">
            <div className={"flex flex-col gap-2 text-center"}>
                <h1 className={"text-2xl font-semibold tracking-tight text-foreground"}>
                    Registration form
                </h1>
                <p className={"text-muted-foreground text-sm"}>
                    Complete your registration with Sigil
                </p>
            </div>
            <div className="grid gap-1">
                <Label className="sr-only" htmlFor="email">
                    Email
                </Label>
                <Input
                    id="email"
                    value={email}
                    readOnly={true}
                    placeholder="Email"
                    className={"text-foreground"}
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled
                />
            </div>
            <CommonInfoInput isLoading={isLoading} formValues={formValues} setFormValues={setFormValues}/>
            <Button disabled={isLoading}
                    className={"hover:text-foreground cursor-pointer bg-foreground text-background"}>
                {isLoading ? <Spinner/> : <KeyRound/> }
                Enroll Passkey and create account
            </Button>
            <Button type={"button"}
                    disabled={isLoading}
                    onClick={() => onSwitchToPassword(formValues)}
                    className={"hover:text-background hover:bg-foreground cursor-pointer bg-background text-foreground shadow-none"}>
                <RectangleEllipsis/>
                Use a Password instead
            </Button>
        </div>
    </form>
}

const PasswordValidationText = "Password must be at least 8 character long, have at least one lower case character, one upper case character, one number and one special character.";

const PasswordBasedCompletionForm: FC<BaseCompletionFormProps & {
    onSwitchToPasskey: Callback<BaseCompleteUserRegistrationFormDto>,
}> = ({ submissionUrl, email, isLoading, setIsLoading, form, privateKey, onSwitchToPasskey }) => {
    const [showPassword, setShowPassword] = useState(false)
    const [showRepeatPassword, setShowRepeatPassword] = useState(false)
    const [formValues, setFormValues] = useState<PasswordBasedCompleteUserRegistrationFormDto>({
        ...form,
        password: '',
        repeatPassword: '',
    })
    const navigate = useNavigate()

    useEffect(() => {
        setFormValues(f => ({
            ...form,
            password: f.password,
            repeatPassword: f.repeatPassword,
        }))
    }, [form]);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { id, value } = e.target;
        setFormValues((prev) => ({
            ...prev,
            [id]: value,
        }));
    };

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        if (!privateKey){
            toast.error("Generating encryption key, please retry later")
            return
        }

        try {
            setIsLoading(true)
            if (formValues.password !== formValues.repeatPassword){
                toast.error("Password does not match");
                return
            }
            if (!validatePassword(formValues.password)){
                toast.error(PasswordValidationText)
            }

            const parallelism = 1
            const memory = 32768
            const iterations = 3
            const salt = crypto.getRandomValues(new Uint8Array(16))
            const encoder = new TextEncoder()
            const parameters = new Uint8Array(12)
            const parametersView = new DataView(parameters.buffer, parameters.byteOffset, parameters.byteLength)
            parametersView.setUint32(0, parallelism, true)
            parametersView.setUint32(4, memory, true)
            parametersView.setUint32(8, iterations, true)
            const parametersBase64 = uint8ArrayToBase64(parameters)

            const derivedKey = await deriveArgon2idKey(encoder.encode(formValues.password), salt, iterations, memory, parallelism, 32)
            const encryptionKey = await crypto.subtle.importKey(
                "raw",
                derivedKey,
                { name: "AES-GCM" },
                false,
                ["encrypt"]
            )

            const nonce = crypto.getRandomValues(new Uint8Array(12))
            const encryptedPkcs8 = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv: nonce },
                encryptionKey,
                privateKey
            )

            const keyDerivationSettings = `argon2id$${uint8ArrayToBase64(salt)}$${parametersBase64}`
            const passwordCredential = {
                keyDerivationSettings,
                cipher: {
                    decryptionMethod: "USER_PASSWORD",
                    iv: uint8ArrayToBase64(nonce),
                    cipher: uint8ArrayToBase64(new Uint8Array(encryptedPkcs8))
                }
            }

            await api.post(submissionUrl, {
                ...formValues,
                passwordCredential
            })

            toast.success("Registration completed, please sign in again")
            navigate("/login")
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    };

    return <form onSubmit={handleSubmit}>
        <div className="grid gap-2">
            <div className={"flex flex-col gap-2 text-center"}>
                <h1 className={"text-2xl font-semibold tracking-tight text-foreground"}>
                    Registration form
                </h1>
                <p className={"text-muted-foreground text-sm"}>
                    Complete your registration with Sigil
                </p>
            </div>
            <div className="grid gap-1">
                <Label className="sr-only" htmlFor="email">
                    Email
                </Label>
                <Input
                    id="email"
                    value={email}
                    readOnly={true}
                    placeholder="Email"
                    className={"text-foreground"}
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled
                />
            </div>
            <CommonInfoInput isLoading={isLoading} formValues={formValues} setFormValues={setFormValues}/>
            <div className="grid gap-1">
                <Label className="sr-only" htmlFor="password">
                    Password
                </Label>
                <div className="relative flex-1 items-center flex-grow">
                    <Tooltip>
                        <TooltipTrigger asChild>
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
                        </TooltipTrigger>
                        <TooltipContent>
                            { PasswordValidationText }
                        </TooltipContent>
                    </Tooltip>
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
            <div className="grid gap-1">
                <Label className="sr-only" htmlFor="password">
                    Repeat password
                </Label>
                <div className="relative flex-1 items-center flex-grow">
                    <Input
                        id="repeatPassword"
                        value={formValues.repeatPassword}
                        onChange={handleChange}
                        className={"text-foreground"}
                        placeholder="Repeat password"
                        type={showRepeatPassword ? "text" : "password"}
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
                    className={"hover:text-foreground cursor-pointer bg-foreground text-background"}>
                {isLoading ? <Spinner/> : <RectangleEllipsis/> }
                Create account with this Password
            </Button>
            <Button type={"button"}
                    disabled={isLoading}
                    onClick={() => onSwitchToPasskey(formValues)}
                    className={"hover:text-background hover:bg-foreground cursor-pointer bg-background text-foreground shadow-none"}>
                <KeyRound/>
                Enroll Passkey instead
            </Button>
        </div>
    </form>
}

const CompletionForm: FC<{
    submissionUrl: string,
    email: string,
}> = ({ submissionUrl, email }) => {
    const [formValues, setFormValues] = useState({
        firstName: '',
        lastName: '',
        publicRsaKey: '',
    } as BaseCompleteUserRegistrationFormDto)
    const [isLoading, setIsLoading] = useState(false)
    const [isPassword, setIsPassword] = useState(false)
    const [keyPair, setKeyPair] = useState(null as EncodedKeyPair | null)

    useEffect(() => {
        generateEncodedRsaOaepWithSha256KeyPair().then(kp => setKeyPair(kp))
    }, []);

    useEffect(() => {
        setFormValues(f => ({
            ...f,
            publicRsaKey: keyPair ? uint8ArrayToBase64(keyPair.publicKey) : ''
        }))
    }, [keyPair]);

    const switchToPassword = (form: BaseCompleteUserRegistrationFormDto) => {
        setFormValues(form)
        setIsPassword(true)
    }

    const switchToPasskey = (form: BaseCompleteUserRegistrationFormDto) => {
        setFormValues(form)
        setIsPassword(false)
    }

    return <div className={"min-h-screen w-full flex flex-row"}>
        <div className={"min-w-1/2 bg-muted hidden lg:flex border-r border-sidebar"}>
        </div>
        <div className={"flex flex-col justify-center w-full bg-background"}>
            <div className={"flex flex-row w-full justify-center"}>
                <div className={"flex flex-row w-full justify-center"}>
                    <div className={"grid gap-1 w-2/3"}>
                        { isPassword
                            ? <PasswordBasedCompletionForm isLoading={isLoading}
                                                           setIsLoading={setIsLoading}
                                                           submissionUrl={submissionUrl}
                                                           email={email}
                                                           form={formValues}
                                                           privateKey={keyPair?.privateKey}
                                                           onSwitchToPasskey={switchToPasskey}/>
                            : <PasskeyBasedCompletionForm isLoading={isLoading}
                                                          setIsLoading={setIsLoading}
                                                          submissionUrl={submissionUrl}
                                                          email={email}
                                                          form={formValues}
                                                          privateKey={keyPair?.privateKey}
                                                          onSwitchToPassword={switchToPassword}/>}
                    </div>
                </div>
            </div>
        </div>
    </div>
}

const CompleteSignupPage = () => {
    const [searchParams] = useSearchParams()
    const [submission, setSubmission] = useState(null as string | null)
    const [firstLoad, setFirstLoad] = useState(true)
    const [probeResult, setProbeResult] = useState(null as InvitationProbeResultDto | null)
    const navigate = useNavigate()

    useEffect(() => {
        setSubmission(searchParams.get('submission'))
        setFirstLoad(false)
    }, [searchParams]);

    useEffect(() => {
        if (!submission){
            if (firstLoad){
                return
            }

            toast.error('Invalid registration completion URL')
            navigate('/login')
            return
        }
        if (!submission.startsWith(`${BACKEND_AUTHORITY}/api/auth/register/complete`)){
            toast.error('Invalid registration completion URL')
            navigate('/login')
            return;
        }

        continueRegistration(submission).then(undefined)
    }, [submission, firstLoad]);

    const continueRegistration = async (submissionUrl: string) => {
        try {
            const response = await axios.get(submissionUrl)
            setProbeResult(response.data as InvitationProbeResultDto)
        } catch (e: unknown) {
            notifyApiError(e)
            navigate('/login')
        }
    }

    return <div className={'min-h-screen w-full flex flex-col'}>
        { (probeResult && submission) ? <CompletionForm submissionUrl={submission} email={probeResult.email}/> : <FullSizeSpinner/> }
    </div>
}

export default CompleteSignupPage