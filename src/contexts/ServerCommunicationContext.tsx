import {createContext, type FC, type ReactNode, useContext, useState} from "react";
import {base64ToUint8Array, encryptWithPublicKey, uint8ArrayToBase64} from "@/utils/cryptography.ts";
import api from "@/api.ts";

export type ServerCommunicationContextType = {
    wrapSecret: (data: Uint8Array) => Promise<string>
}

const ServerCommunicationContext = createContext(null as never as ServerCommunicationContextType)

export const useServerCommunication = () => {
    return useContext(ServerCommunicationContext)
}

const getServerEphemeralKey = async (): Promise<{ publicKey: CryptoKey, version: number }> => {
    const response = await api.get("auth/public-key")
    const data = response.data as { publicKey: string, version: number }
    const cleanPem = data.publicKey
        .replace("-----BEGIN PUBLIC KEY-----", "")
        .replace("-----END PUBLIC KEY-----", "")
        .replace(/\s/g, "");
    const pem = base64ToUint8Array(cleanPem)
    const publicKey = await crypto.subtle.importKey(
        "spki",
        pem,
        {
            name: 'RSA-OAEP',
            hash: { name: 'SHA-256' }
        },
        false,
        ["encrypt"]
    );

    return {
        publicKey,
        version: data.version
    }
}

export const ServerCommunicationProvider: FC<{ children: ReactNode | ReactNode[] }> = ({ children }) => {
    const [publicKey, setPublicKey] = useState(null as { publicKey: CryptoKey, version: number } | null)

    const wrapSecret = async (data: Uint8Array): Promise<string> => {
        let key = publicKey
        if (key === null){
            key = await getServerEphemeralKey()
            setPublicKey(key)
        }

        const wrappedData = await encryptWithPublicKey(key.publicKey, data)
        return `vault:v${key.version}:${uint8ArrayToBase64(wrappedData)}`
    }

    const value: ServerCommunicationContextType = {
        wrapSecret
    }

    return <ServerCommunicationContext.Provider value={value}>
        {children}
    </ServerCommunicationContext.Provider>
}
