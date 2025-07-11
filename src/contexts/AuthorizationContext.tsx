import {createContext, type FC, type ReactNode, useContext, useState} from "react";
import api from "../api.tsx"
import type {AuthenticationResponseDto} from "@/dto/AuthenticationResponseDto.ts";
import {getAuth, removeAuth, removeSelectedProjectId, storeAuthResponse} from "@/utils/auth.ts";
// @ts-ignore
import argon2 from 'argon2-browser/dist/argon2-bundled.min.js';
import {base64ToUint8Array, decryptAESGCM, digestSha256, uint8ArrayToBase64} from "@/utils/cryptography.ts";

export type AuthorizationContextType = {
    userPrivateKey: CryptoKey | null,
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

    const signInWithEmailAndPassword = async (email: string, password: string): Promise<void> => {
        const response = await api.post("auth", { email, password })
        const authResponse = response.data as AuthenticationResponseDto;
        storeAuthResponse(authResponse)
        await decryptPrivateKey(password)
    }

    const invalidateAllSessions = async (userId: number): Promise<void> => {
        await api.post("auth/invalidate", { userId })
    }

    const localLogout = () => {
        setPrivateKey(null)
        removeAuth()
        removeSelectedProjectId()
        window.location.href = '/login'
    }

    const value: AuthorizationContextType = {
        userPrivateKey: privateKey,
        signInWithEmailAndPassword,
        invalidateAllSessions,
        localLogout,
        decryptPrivateKey,
    }

    return <AuthorizationContext.Provider value={value}>
        { children }
    </AuthorizationContext.Provider>
}