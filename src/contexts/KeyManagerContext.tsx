import {createContext, type FC, type ReactNode, useCallback, useContext, useEffect} from "react";
import {AllStores, openDb} from "@/utils/db.ts";
import {base64ToUint8Array, createPrivateKey, decryptAESGCM, uint8ArrayToBase64} from "@/utils/cryptography.ts";
import {useSearchParams} from "react-router";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";

const ROTATION_CYCLE = 60 * 10;
const CLEANUP_CYCLE = 3 * ROTATION_CYCLE

type EphemeralKey = {
    id: string,
    createdAt: number
}

export type EphemeralSymmetricKey = EphemeralKey & {
    key: string,
}

export type KeyManagerContextType = {
    getEphemeralSymmetricKey: typeof getEphemeralSymmetricKey,
    getOrCreateEphemeralSymmetricKey: typeof getOrCreateEphemeralSymmetricKey,
}

const KeyManagerContext = createContext(null as never as KeyManagerContextType)

export const useKeyManager = () =>{
    return useContext(KeyManagerContext)
}

const cleanup = async () => {
    const db = await openDb()
    const date = Math.floor(Date.now() / 1000)
    return await db.iterateDelete<EphemeralKey>(AllStores.EphemeralKeys, k => (date - CLEANUP_CYCLE) > k.createdAt)
}

const getEphemeralSymmetricKey = async (): Promise<EphemeralSymmetricKey | null> => {
    const date = Math.floor(Date.now() / 1000)
    const step = Math.floor(date / ROTATION_CYCLE)

    const db = await openDb()
    return (await db.getObject(AllStores.EphemeralKeys, `/symmetric/${step}`)) as EphemeralSymmetricKey | null
}

const getOrCreateEphemeralSymmetricKey = async (): Promise<EphemeralSymmetricKey> => {
    const date = Math.floor(Date.now() / 1000)
    const step = Math.floor(date / ROTATION_CYCLE)

    const db = await openDb()
    let entry = (await db.getObject(AllStores.EphemeralKeys, `/symmetric/${step}`)) as EphemeralSymmetricKey | null
    if (!entry){
        const key = crypto.getRandomValues(new Uint8Array(32))
        entry = {
            id: `/symmetric/${step}`,
            key: uint8ArrayToBase64(key),
            createdAt: date
        }

        await db.addObject(AllStores.EphemeralKeys, entry)
    }

    return entry
}

export const KeyManagerProvider: FC<{ children: ReactNode }> = ({children}) => {
    const {userPrivateKey, setUserPrivateKey} = useAuthorization()
    const [searchParams, setSearchParams] = useSearchParams()

    const loadEphemeralKey = useCallback(async (wrappedUserKey: string, nonce: string) => {
        try {
            const ephemeralKey = await getEphemeralSymmetricKey()
            if (!ephemeralKey){
                return
            }
            const decrypted = await decryptAESGCM(base64ToUint8Array(wrappedUserKey), base64ToUint8Array(nonce), base64ToUint8Array(ephemeralKey.key))
            const uKey = await createPrivateKey(decrypted, false)
            setUserPrivateKey(uKey)
        } catch (e){
            console.error(e)
        } finally {
            setSearchParams(s => {
                const newParams = new URLSearchParams(s)
                newParams.delete('x-ptf-wrapped-ekey')
                newParams.delete('x-ptf-wrapped-nonce')
                return newParams
            })
        }
    }, [setSearchParams, setUserPrivateKey])

    useEffect(() => {
        cleanup().then(c => console.debug("Cleaned", c, "key entries"))
    }, [])

    useEffect(() => {
        if (userPrivateKey){
            return
        }

        const wrapped = searchParams.get('x-ptf-wrapped-ekey')
        const nonce = searchParams.get('x-ptf-wrapped-nonce')
        if (!wrapped || !nonce){
            return
        }

        loadEphemeralKey(wrapped, nonce)
            .then(undefined)
    }, [userPrivateKey, searchParams, loadEphemeralKey]);

    const value: KeyManagerContextType = {
        getEphemeralSymmetricKey,
        getOrCreateEphemeralSymmetricKey,
    }

    return <KeyManagerContext.Provider value={value}>
        { children }
    </KeyManagerContext.Provider>
}

