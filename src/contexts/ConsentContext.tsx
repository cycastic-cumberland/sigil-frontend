import {createContext, type FC, type ReactNode, type RefObject, useContext, useEffect, useMemo, useState} from "react";
import {type Callback, type FulfillablePromise, makeFulfillablePromise} from "@/utils/misc.ts";
import ConfirmationDialog from "@/interfaces/components/ConfirmationDialog.tsx";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import PrivateKeyDecryptionDialog from "@/interfaces/components/PrivateKeyDecryptionDialog.tsx";

export type AgreementFormType = {
    title: string,
    message: string,
    acceptText: string,
    cancelText?: string,
    destructive?: boolean,
    ref?: RefObject<Promise<boolean> | null>,
}

export type ConsentContextType = {
    requireAgreement: (form: AgreementFormType) => Promise<boolean>,
    requireDecryption: () => Promise<CryptoKey>,
}

type PromiseForm<T> = {
    resolve: Callback<T>,
    reject: Callback<unknown>,
}

const ConsentContext = createContext(null as never as ConsentContextType)

export const useConsent = () => {
    return useContext(ConsentContext)
}


const AgreementForm: FC<AgreementFormType & PromiseForm<boolean>> = ({ resolve, title, message, acceptText, cancelText, destructive }) => {
    const [opened, setOpened] = useState(true)
    const [isResolved, setIsResolved] = useState(false)

    const onSetOpened = (b: boolean) => {
        setOpened(b)
        if (!b && !isResolved){
            resolve(false)
            setIsResolved(true)
        }
    }

    const onAccepted = () => {
        if (!isResolved){
            resolve(true)
            setIsResolved(true)
            setOpened(false)
        }
    }

    return <ConfirmationDialog confirmationOpened={opened}
                               setConfirmationOpened={onSetOpened}
                               onAccepted={onAccepted}
                               title={title}
                               message={message}
                               acceptText={acceptText}
                               cancelText={cancelText}
                               destructive={destructive}/>
}

const DecryptionForm: FC<PromiseForm<CryptoKey>> = ({ resolve, reject }) => {
    const [opened, setOpened] = useState(true)
    const [isResolved, setIsResolved] = useState(false)
    const {userPrivateKey} = useAuthorization()

    useEffect(() => {
        if (userPrivateKey && !isResolved){
            setOpened(false)
            setIsResolved(true)
            resolve(userPrivateKey)
        }
    }, [isResolved, userPrivateKey]);

    const onReject = () => {
        if (isResolved){
            return
        }

        setOpened(false)
        setIsResolved(true)
        reject(Error("Decryption canceled"))
    }

    return <PrivateKeyDecryptionDialog openDialog={opened} onReject={onReject}/>
}

export const ConsentProvider: FC<{ children?: ReactNode }> = ({ children }) => {
    const [decryptionPromise, setDecryptionPromise] = useState(null as FulfillablePromise<CryptoKey> | null)
    const [decryptionForm, setDecryptionForm] = useState(null as {id: string, node: ReactNode} | null)
    const {userPrivateKey} = useAuthorization()
    const [forms, setForms] = useState([] as {id: string, node: ReactNode}[])
    const allForms = useMemo(() => {
        if (decryptionForm){
            return [...forms, decryptionForm]
        }

        return [...forms]
    }, [forms, decryptionForm])

    useEffect(() => {
        if (decryptionPromise?.isFulfilled ?? false){
            setDecryptionPromise(null)
        }
    }, [userPrivateKey, decryptionPromise]);

    const requireAgreement = (form: AgreementFormType) => {
        if (form.ref?.current){
            throw Error("Action triggered twice")
        }
        const id = crypto.randomUUID()
        const remove = () => {
            setForms(f => f.filter(v => v.id !== id))
            if (form.ref){
                form.ref.current = null
            }
        }

        let resolve!: (value: boolean | PromiseLike<boolean>) => void;
        let reject!: (reason?: unknown) => void;

        const promise = new Promise<boolean>((res, rej) => {
            resolve = res;
            reject = rej;
        });

        const onResolve = (accepted: boolean) => {
            remove()
            resolve(accepted)
        }

        const onReject = (e: unknown) => {
            remove()
            reject(e)
        }

        setForms(f => (
            [...f, {
                id,
                node: <AgreementForm resolve={onResolve} reject={onReject} {...form}/>
            }]))

        if (form.ref){
            form.ref.current = promise
        }
        return promise
    }

    const requireDecryption = () => {
        if (decryptionPromise){
            return decryptionPromise
        }
        if (userPrivateKey){
            const p = makeFulfillablePromise(Promise.resolve(userPrivateKey))
            setDecryptionPromise(p)
            return p
        }

        const id = crypto.randomUUID()
        const remove = () => {
            setDecryptionForm(null)
        }

        let resolve!: (value: CryptoKey | PromiseLike<CryptoKey>) => void;
        let reject!: (reason?: unknown) => void;

        const promise = new Promise<CryptoKey>((res, rej) => {
            resolve = res;
            reject = rej;
        });

        const onResolve = (accepted: CryptoKey) => {
            remove()
            resolve(accepted)
        }

        const onReject = (e: unknown) => {
            remove()
            reject(e)
            setDecryptionPromise(null)
        }

        setDecryptionForm({
            id,
            node: <DecryptionForm resolve={onResolve} reject={onReject}/>
        })

        return promise
    }

    const value = {
        requireAgreement,
        requireDecryption,
    }

    return <ConsentContext.Provider value={value}>
        {allForms.map(f => f.node)}
        {children}
    </ConsentContext.Provider>
}
