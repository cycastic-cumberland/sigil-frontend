import {createContext, type FC, type ReactNode, useContext, useRef, useState} from "react";
import api from "../api.ts"
import type {AuthenticationResponseDto} from "@/dto/AuthenticationResponseDto.ts";
import {getAuth, removeAuth, storeAuthResponse} from "@/utils/auth.ts";
// @ts-ignore
import argon2 from 'argon2-browser/dist/argon2-bundled.min.js';
import {base64ToUint8Array, decryptAESGCM, digestSha256, uint8ArrayToBase64} from "@/utils/cryptography.ts";
import type {KdfDetailsDto} from "@/dto/KdfDetailsDto.ts";
import {MAGIC_CONSTANT_SAVE_ENCRYPTION_KEY} from "@/utils/debug.ts";
import type {UserInfoDto} from "@/dto/UserInfoDto.ts";

export type AuthorizationContextType = {
    userPrivateKey: CryptoKey | null,
    getUserInfo: () => Promise<UserInfoDto>,
    signInWithEmailAndPassword: (email: string, password: string) => Promise<void>
    invalidateAllSessions: (userId: number) => Promise<void>
    localLogout: () => void,
    decryptPrivateKey: (password: string) => Promise<void>,
}

const AuthorizationContext = createContext(null as never as AuthorizationContextType)

export const useAuthorization = () => {
    return useContext(AuthorizationContext)
}

const deriveKey = async (password: Uint8Array, salt: Uint8Array, iterations: number, memoryCost: number, parallelism: number, keyLen: number): Promise<Uint8Array> => {
    const result = await argon2.hash({
        pass: password,
        type: argon2.ArgonType.Argon2id,
        salt,
        time: iterations,
        mem: memoryCost,
        parallelism,
        hashLen: keyLen,
    })

    return result.hash
}

export const AuthorizationProvider: FC<{ children?: ReactNode }> = ({ children }) => {
    const userInfoRef = useRef(null as UserInfoDto | null)
    const [privateKey, setPrivateKey] = useState(null as CryptoKey | null)

    const decryptPrivateKey = async (password: string) => {
        const authResponse = getAuth()
        if (!authResponse){
            localLogout()
            return
        }

        const kdfSettings = authResponse.kdfSettings;
        const parts = kdfSettings.split('$').filter(s => s)
        if (parts[0] !== "argon2id"){
            throw Error("Unsupported KDF")
        }

        const keyLen = 32
        const encoder = new TextEncoder();
        const pass = encoder.encode(password)
        const salt = base64ToUint8Array(parts[1]);
        const parameters = base64ToUint8Array(parts[2])
        const parametersView = new DataView(parameters.buffer, parameters.byteOffset, parameters.byteLength)
        const parallelism = parametersView.getUint32(0, true)
        const iterations = parametersView.getUint32(8, true)
        const memoryCost = parametersView.getUint32(4, true)
        const derivedKey = await deriveKey(pass, salt, iterations, memoryCost, parallelism, keyLen)
        const kidBase64 = uint8ArrayToBase64(await digestSha256(derivedKey))

        const cipher = authResponse.wrappedUserKey
        if (kidBase64 !== cipher.kid){
            const err = Error("Incorrect password")
            console.error(err)
            throw err
        }

        const iv = base64ToUint8Array(cipher.iv ?? "")
        const cipherText = base64ToUint8Array(cipher.cipher)
        const decryptedPrivateKey = await decryptAESGCM(cipherText, iv, derivedKey)
        const privateKey = await crypto.subtle.importKey(
            "pkcs8",
            decryptedPrivateKey,
            {
                name: 'RSA-OAEP',
                hash: { name: 'SHA-256' }
            },
            false,
            ["decrypt"]
        );
        setPrivateKey(privateKey)
    }

    const deriveArgon2idHash = async (email: string, password: string): Promise<string> => {
        const response = await api.get(`auth/kdf?userEmail=${encodeURIComponent(email)}`)
        const kdfSettings = response.data as KdfDetailsDto
        if (kdfSettings.algorithm !== 'argon2id'){
            throw Error("Unsupported hash algorithm: " + kdfSettings.algorithm)
        }

        const keyLen = 32
        const encoder = new TextEncoder();
        const pass = encoder.encode(password)
        const salt = base64ToUint8Array(kdfSettings.salt);
        const parameters = kdfSettings.parameters
        const derivedKey = await deriveKey(pass, salt, parameters.iterations, parameters.memoryKb, parameters.parallelism, keyLen)
        return uint8ArrayToBase64(derivedKey)
    }

    const signInWithEmailAndPassword = async (email: string, password: string): Promise<void> => {
        const response = await api.post("auth", {
            email,
            hashedPassword: await deriveArgon2idHash(email, password),
        })
        const authResponse = response.data as AuthenticationResponseDto;
        storeAuthResponse(authResponse)
        await decryptPrivateKey(password)
    }

    const getUserInfo = async () => {
        if (userInfoRef.current){
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
        signInWithEmailAndPassword,
        getUserInfo,
        invalidateAllSessions,
        localLogout,
        decryptPrivateKey,
    }

    return <AuthorizationContext.Provider value={value}>
        { children }
    </AuthorizationContext.Provider>
}