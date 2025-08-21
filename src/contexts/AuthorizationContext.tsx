import {createContext, type FC, type ReactNode, useContext, useRef, useState} from "react";
import api from "../api.ts"
import type {AuthenticationResponseDto} from "@/dto/user/AuthenticationResponseDto.ts";
import {getAuth, removeAuth, storeAuthResponse} from "@/utils/auth.ts";
import {
    base64ToUint8Array,
    decryptAESGCM, deriveArgon2idKey,
    deriveEncryptionKeyFromWebAuthnPrf,
    signWithSHA256withRSAPSS,
    uint8ArrayToBase64
} from "@/utils/cryptography.ts";
import type {KdfDetailsDto} from "@/dto/cryptography/KdfDetailsDto.ts";
import {MAGIC_CONSTANT_SAVE_ENCRYPTION_KEY} from "@/utils/debug.ts";
import type {BaseUserInfoDto, UserInfoDto} from "@/dto/user/UserInfoDto.ts";
import type {CipherDto} from "@/dto/cryptography/CipherDto.ts";
import {getRpIdFromUrl} from "@/utils/path.ts";
import type {Prf} from "@/dto/cryptography/webauthn.ts";
import type {EnvelopDto} from "@/dto/cryptography/EnvelopDto.ts";

export type WebAuthnPrfKey = {
    encryptionKey: CryptoKey,
    rawId: Uint8Array,
    salt: Uint8Array,
    transports: AuthenticatorTransport[]
}

export type AuthorizationContextType = {
    authData: AuthenticationResponseDto | null,
    userPrivateKey: CryptoKey | null,
    getUserInfo: (reload?: boolean) => Promise<UserInfoDto>,
    signInWithEmailAndPassword: (email: string, password: string) => Promise<void>,
    signInWithEmailAndPasskey: (email: string) => Promise<void>,
    generateWebAuthnPrfKey: (user: BaseUserInfoDto) => Promise<WebAuthnPrfKey>,
    resendInvitation: (email: string) => Promise<void>,
    invalidateAllSessions: (userId: number) => Promise<void>,
    localLogout: () => void,
    decryptPrivateKey: (password: string) => Promise<void>,
    decryptWithWebAuthn: () => Promise<void>,
    transientDecryptPrivateKey: (password: string, cipher: CipherDto) => Promise<Uint8Array>,
    getEnvelop: () => Promise<EnvelopDto>,
}

const AuthorizationContext = createContext(null as never as AuthorizationContextType)

export const useAuthorization = () => {
    return useContext(AuthorizationContext)
}

const decryptPcks8PrivateKey = async (pass: Uint8Array, salt: Uint8Array, parallelism: number, iterations: number, memoryCost: number, cipher: CipherDto): Promise<Uint8Array> => {
    const keyLen = 32
    const derivedKey = await deriveArgon2idKey(pass, salt, iterations, memoryCost, parallelism, keyLen)

    const iv = base64ToUint8Array(cipher.iv ?? "")
    const cipherText = base64ToUint8Array(cipher.cipher)
    try {
        return await decryptAESGCM(cipherText, iv, derivedKey)
    } catch (e){
        if (e instanceof DOMException && e.name === "OperationError"){
            throw Error("Incorrect password")
        }
        throw e
    }
}

const createPrivateKey = (pkcs8: Uint8Array, isSign: boolean) => {
    return crypto.subtle.importKey(
        "pkcs8",
        pkcs8,
        {
            name: isSign ? 'RSA-PSS' : 'RSA-OAEP',
            hash: { name: 'SHA-256' }
        },
        false,
        [isSign ? "sign" : "decrypt"]
    )
}

const transientDecryptPrivateKey = async (password: string, cipher: CipherDto) => {
    const authResponse = getAuth()
    if (!authResponse){
        throw Error("User not logged in")
    }

    const kdfSettings = authResponse.kdfSettings;
    if (!kdfSettings){
        throw Error("User does not have a password")
    }
    const parts = kdfSettings.split('$').filter(s => s)
    if (parts[0] !== "argon2id"){
        throw Error("Unsupported KDF")
    }
    const salt = base64ToUint8Array(parts[1]);
    const parameters = base64ToUint8Array(parts[2])
    const parametersView = new DataView(parameters.buffer, parameters.byteOffset, parameters.byteLength)
    const parallelism = parametersView.getUint32(0, true)
    const memoryCost = parametersView.getUint32(4, true)
    const iterations = parametersView.getUint32(8, true)

    const encoder = new TextEncoder();
    const pass = encoder.encode(password)
    return await decryptPcks8PrivateKey(pass, salt, parallelism, iterations, memoryCost, cipher)
}

const deriveWebAuthnKeyEncryptionKey = async (challenge: Uint8Array, credentialId: Uint8Array, salt: Uint8Array, transports: AuthenticatorTransport[]) => {
    const loginCredential = await navigator.credentials.get({
        publicKey: {
            challenge,
            allowCredentials: [
                {
                    id: credentialId,
                    transports,
                    type: "public-key",
                },
            ],
            rpId: getRpIdFromUrl(window.location.href),
            userVerification: "required",
            extensions: {
                prf: {
                    eval: {
                        first: salt,
                    },
                },
            },
        },
    })

    if (!loginCredential){
        throw Error("Failed to read passkey")
    }

    if (!(loginCredential instanceof PublicKeyCredential)){
        throw Error("Device not supported")
    }

    let prf: Prf | undefined
    try {
        prf = loginCredential.getClientExtensionResults()?.prf as Prf | undefined
    } catch (e){
        console.error(e)
    }
    if (!prf){
        throw Error("This browser does not support WebAuthn PRF")
    }
    return await deriveEncryptionKeyFromWebAuthnPrf(prf)
}

export const AuthorizationProvider: FC<{ children?: ReactNode }> = ({ children }) => {
    const userInfoRef = useRef(null as UserInfoDto | null)
    const [authData, setAuthData] = useState(null as AuthenticationResponseDto | null)
    const [privateKey, setPrivateKey] = useState(null as CryptoKey | null)

    const getEnvelop = async () => {
        const response = await api.get("auth/envelop")
        return response.data as EnvelopDto
    }

    const decryptPrivateKey = async (password: string) => {
        const data = await getEnvelop()
        if (!data.passwordCipher){
            throw Error("Password not enabled")
        }
        const pkcs8 = await transientDecryptPrivateKey(password, data.passwordCipher)
        setPrivateKey(await createPrivateKey(pkcs8, false))
    }

    const signInInternal = async (email: string, signatureVerificationWindow: number, pkcs8: Uint8Array) => {
        const signingPrivateKey = await createPrivateKey(pkcs8, true)

        const unixTimestamp = Math.floor(Date.now() / 1000);
        const payload = `${email.toUpperCase()}:${Math.floor(unixTimestamp / signatureVerificationWindow)}`
        const encoder = new TextEncoder();
        const encodedPayload = encoder.encode(payload)
        const signature = uint8ArrayToBase64(await signWithSHA256withRSAPSS(signingPrivateKey, encodedPayload))
        const authResponse = await api.post("auth", {
            payload,
            algorithm: "SHA256withRSA/PSS",
            signature,
        })
        const authData = authResponse.data as AuthenticationResponseDto;
        storeAuthResponse(authData)
        setAuthData(authData)
        const encryptionPrivateKey = await createPrivateKey(pkcs8, false)
        setPrivateKey(encryptionPrivateKey)
    }

    const signInWithEmailAndPassword = async (email: string, password: string): Promise<void> => {
        const response = await api.get(`auth/kdf?userEmail=${encodeURIComponent(email)}`)
        const kdfSettings = response.data as KdfDetailsDto
        if (kdfSettings.algorithm !== 'argon2id'){
            throw Error("Unsupported hash algorithm: " + kdfSettings.algorithm)
        }

        const salt = base64ToUint8Array(kdfSettings.salt);
        const parameters = kdfSettings.parameters
        const encoder = new TextEncoder();
        const pass = encoder.encode(password)
        const pkcs8 = await decryptPcks8PrivateKey(pass, salt, parameters.parallelism, parameters.iterations, parameters.memoryKb, kdfSettings.wrappedUserKey)
        await signInInternal(email, kdfSettings.signatureVerificationWindow, pkcs8)
    }

    const signInWithEmailAndPasskey = async (email: string) => {
        const response = await api.get(`auth/kdf?userEmail=${encodeURIComponent(email)}&method=WEBAUTHN`)
        const kdfSettings = response.data as KdfDetailsDto
        if (kdfSettings.algorithm !== 'argon2id'){
            throw Error("Unsupported hash algorithm: " + kdfSettings.algorithm)
        }

        const encoder = new TextEncoder();
        const uid = encoder.encode(email.toUpperCase())
        const webAuthnCredentials = kdfSettings.webAuthnCredential
        if (!webAuthnCredentials.wrappedUserKey.iv){
            throw Error("Nonce not found")
        }
        const encryptionKey = await deriveWebAuthnKeyEncryptionKey(uid,
            base64ToUint8Array(webAuthnCredentials.credentialId),
            base64ToUint8Array(webAuthnCredentials.salt),
            webAuthnCredentials.transports)

        const nonce = base64ToUint8Array(webAuthnCredentials.wrappedUserKey.iv)
        const cipherText = base64ToUint8Array(webAuthnCredentials.wrappedUserKey.cipher)
        let pkcs8: Uint8Array = new Uint8Array()
        try {
            pkcs8 = await decryptAESGCM(cipherText, nonce, encryptionKey)
        } catch (e){
            if (e instanceof DOMException && e.name === "OperationError"){
                throw Error("User don't have passkey enrolled or invalid passkey detected")
            }
            throw e
        }

        await signInInternal(email, kdfSettings.signatureVerificationWindow, pkcs8)
    }

    const generateWebAuthnPrfKey = async (user: BaseUserInfoDto) => {
        const encoder = new TextEncoder();
        const uid = encoder.encode(user.email.toUpperCase())
        const salt = crypto.getRandomValues(new Uint8Array(32))
        const regCredential = await navigator.credentials.create({
            publicKey: {
                challenge: uid,
                rp: {
                    name: "Sigil",
                    id: getRpIdFromUrl(window.location.href),
                },
                user: {
                    id: uid,
                    name: user.email,
                    displayName: `${user.firstName} ${user.lastName}`,
                },
                pubKeyCredParams: [
                    { alg: -8, type: "public-key" },   // Ed25519
                    { alg: -7, type: "public-key" },   // ES256
                    { alg: -257, type: "public-key" }, // RS256
                ],
                authenticatorSelection: {
                    userVerification: "required",
                },
                extensions: {
                    hmacCreateSecret: true,
                    prf: {
                        eval: {
                            first: salt,
                        },
                    },
                },
            },
        })

        if (!regCredential){
            throw Error("Failed to enroll passkey")
        }

        if (!(regCredential instanceof PublicKeyCredential)){
            throw Error("Device not supported")
        }

        let prf: Prf | undefined
        try {
            prf = regCredential.getClientExtensionResults()?.prf as Prf | undefined
        } catch (e){
            console.error(e)
        }
        if (!prf){
            throw Error("This browser does not support WebAuthn PRF")
        }

        const encryptionKey = await deriveEncryptionKeyFromWebAuthnPrf(prf)
        return {
            encryptionKey,
            rawId: new Uint8Array(regCredential.rawId),
            salt,
            transports: (regCredential.response as AuthenticatorAttestationResponse).getTransports() as AuthenticatorTransport[]
        } as WebAuthnPrfKey
    }

    const resendInvitation = (email: string): Promise<void> => {
        return api.post("auth/register/resend", { email })
    }

    const decryptWithWebAuthn = async () => {
        const auth = getAuth()
        if (!auth){
            throw Error("User not signed in")
        }
        const envelop = await getEnvelop()
        if (!envelop.webAuthnCipher){
            throw Error("WebAuthn not enabled")
        }

        const webAuthnCredentials = envelop.webAuthnCipher
        if (!webAuthnCredentials.wrappedUserKey.iv){
            throw Error("Nonce not found")
        }
        const encoder = new TextEncoder();
        const uid = encoder.encode(auth.userEmail.toUpperCase())
        const encryptionKey = await deriveWebAuthnKeyEncryptionKey(uid,
            base64ToUint8Array(webAuthnCredentials.credentialId),
            base64ToUint8Array(webAuthnCredentials.salt),
            webAuthnCredentials.transports)

        const nonce = base64ToUint8Array(webAuthnCredentials.wrappedUserKey.iv)
        const cipherText = base64ToUint8Array(webAuthnCredentials.wrappedUserKey.cipher)
        let pkcs8: Uint8Array = new Uint8Array()
        try {
            pkcs8 = await decryptAESGCM(cipherText, nonce, encryptionKey)
        } catch (e){
            if (e instanceof DOMException && e.name === "OperationError"){
                throw Error("User don't have passkey enrolled or invalid passkey detected")
            }
            throw e
        }
        const encryptionPrivateKey = await createPrivateKey(pkcs8, false)
        setPrivateKey(encryptionPrivateKey)
    }

    const getUserInfo = async (reload?: boolean) => {
        if (userInfoRef.current && !reload){
            return userInfoRef.current
        }

        const response = await api.get("auth/self")
        const myInfo = response.data as UserInfoDto
        userInfoRef.current = myInfo
        return myInfo
    }

    const invalidateAllSessions = async (userId: number): Promise<void> => {
        await api.post("auth/invalidate", { userId })
    }

    const localLogout = () => {
        userInfoRef.current = null
        setPrivateKey(null)
        removeAuth()
        localStorage.removeItem(MAGIC_CONSTANT_SAVE_ENCRYPTION_KEY)
        window.location.href = '/login'
    }

    const value: AuthorizationContextType = {
        userPrivateKey: privateKey,
        authData,
        signInWithEmailAndPassword,
        signInWithEmailAndPasskey,
        generateWebAuthnPrfKey,
        resendInvitation,
        getUserInfo,
        invalidateAllSessions,
        localLogout,
        transientDecryptPrivateKey,
        decryptPrivateKey,
        decryptWithWebAuthn,
        getEnvelop,
    }

    return <AuthorizationContext.Provider value={value}>
        { children }
    </AuthorizationContext.Provider>
}
