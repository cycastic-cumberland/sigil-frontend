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
import {notifyApiError} from "@/utils/errors.ts";
import {toast} from "sonner";

const SmtpCredentialPageImpl = () => {
    const [credential, setCredential] = useState(null as DecryptedSmtpCredentialDto | null)
    const [isLoading, setIsLoading] = useState(false)
    const [firstLoad, setFirstLoad] = useState(true)
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
        } catch (e) {
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        (async () => {
            await reloadCredential(id)
            setFirstLoad(false)
        })()
    }, [id]);

    const onSave = async (c: DecryptedSmtpCredentialDto) => {
        try {
            setIsLoading(true)
            setError('')

            await api.post('emails/credential', c)
            await reloadCredential(id)
            toast.success("SMTP credential saved")
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
            toast.success("SMTP credential deleted")
            navigate('/emails/credentials')
        } catch (e) {
            notifyApiError(e)
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
        { firstLoad && isLoading ? <FullSizeSpinner/> : !credential ? <div className={"flex flex-col flex-grow w-full justify-center gap-2"}>
            <div className={"w-full flex flex-row justify-center"}>
                <Label className={"text-foreground font-bold text-4xl"}>
                    Credential not found
                </Label>
            </div>
        </div> : <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-foreground font-bold"}>
                    Credential info
                </Label>
            </div>
            <div className={"w-full"}>
                <div className={"lg:w-1/2 text-foreground flex flex-col gap-2"}>
                    <SmtpCredentialEditForm submissionText={'Save changes'} error={error} isLoading={isLoading} onSave={onSave} credential={credential}/>
                    <Button className={"cursor-pointer bg-destructive text-background border-destructive border-1 hover:bg-background hover:text-destructive"}
                            disabled={isLoading}
                            onClick={() => setConfirmDeleteOpened(true)}>Delete credential</Button>
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