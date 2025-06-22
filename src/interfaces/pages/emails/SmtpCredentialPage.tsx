import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import ProjectGuard from "@/interfaces/layouts/ProjectGuard.tsx";
import {Label} from "@/components/ui/label.tsx";
import {useEffect, useState} from "react";
import type {DecryptedSmtpCredentialDto} from "@/dto/SmtpCredentialDto.ts";
import {useNavigate, useParams} from "react-router";
import api from "@/api.tsx";
import SmtpCredentialEditForm from "@/interfaces/components/SmtpCredentialEditForm.tsx";
import {Button} from "@/components/ui/button.tsx";
import type {AxiosError} from "axios";
import ConfirmationDialog from "@/interfaces/components/ConfirmationDialog.tsx";
import {useProject} from "@/contexts/ProjectContext.tsx";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";

const SmtpCredentialPageImpl = () => {
    const [credential, setCredential] = useState(null as DecryptedSmtpCredentialDto | null)
    const [isLoading, setIsLoading] = useState(false)
    const [confirmDeleteOpened, setConfirmDeleteOpened] = useState(false)
    const [error, setError] = useState('')
    const { id } = useParams()
    const navigate = useNavigate()

    const reloadCredential = async (id: string | undefined) => {
        try {
            setIsLoading(true)
            if (!id){
                return;
            }
            const response = await api.get(`emails/credential?id=${encodeURIComponent(id)}`)
            setCredential(response.data as DecryptedSmtpCredentialDto)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        (async () => await reloadCredential(id))()
    }, [id]);

    const onSave = async (c: DecryptedSmtpCredentialDto) => {
        try{
            setIsLoading(true)
            setError('')

            await api.post('emails/credential', c)
            await reloadCredential(id)
        } catch (e){
            // @ts-ignore
            setError((e as AxiosError).response?.data?.message ?? "")
        } finally {
            setIsLoading(false)
        }
    }

    const onDelete = async () => {
        if (!credential || !credential.id){
            throw Error("Unreachable")
        }
        try {
            setIsLoading(true)
            setError('')

            await api.delete(`emails/credential?id=${encodeURIComponent(credential.id)}`)
            navigate('/emails/credentials')
        } finally {
            setIsLoading(false)
        }
    }

    return <>
        <ConfirmationDialog confirmationOpened={confirmDeleteOpened}
                            setConfirmationOpened={setConfirmDeleteOpened}
                            onAccepted={onDelete}
                            title={'Delete SMTP credential'}
                            message={'Are you sure you want to delete this credential?'}
                            acceptText={'Delete'}
                            destructive/>
        { isLoading ? <FullSizeSpinner/> : !credential ? <div className={"flex flex-col flex-grow w-full justify-center gap-2"}>
            <div className={"w-full flex flex-row justify-center"}>
                <Label className={"text-secondary font-bold text-4xl"}>
                    Credential not found
                </Label>
            </div>
        </div> : <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-secondary font-bold"}>
                    Credential info
                </Label>
            </div>
            <div className={"w-full"}>
                <div className={"lg:w-1/2 text-secondary flex flex-col gap-2"}>
                    <SmtpCredentialEditForm submissionText={'Save changes'} error={error} isLoading={isLoading} onSave={onSave} credential={credential}/>
                    <Button className={"cursor-pointer bg-destructive"} onClick={() => setConfirmDeleteOpened(true)}>Delete credential</Button>
                </div>
            </div>
        </div> }
    </>
}

const SmtpCredentialPage = () => {
    const {activeProject} = useProject()

    return <MainLayout>
        <ProjectGuard>
            <SmtpCredentialPageImpl key={`${activeProject?.id ?? 0}`}/>
        </ProjectGuard>
    </MainLayout>
}

export default SmtpCredentialPage;