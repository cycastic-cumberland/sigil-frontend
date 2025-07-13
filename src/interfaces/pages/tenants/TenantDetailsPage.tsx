import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import {useEffect, useState} from "react";
import type {TenantDto} from "@/dto/TenantDto.ts";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import {useNavigate} from "react-router";
import {useTenant} from "@/contexts/TenantContext.tsx";
import ProjectEditForm from "@/interfaces/components/ProjectEditForm.tsx";
import api from "@/api.ts";
import type {AxiosError} from "axios";
import ConfirmationDialog from "@/interfaces/components/ConfirmationDialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {notifyApiError} from "@/utils/errors.ts";
import {toast} from "sonner";

const TenantDetailsPage = () => {
    const [project, setProject] = useState(null as TenantDto | null)
    const [isLoading, setIsLoading] = useState(true)
    const [confirmDeleteOpened, setConfirmDeleteOpened] = useState(false)
    const [error, setError] = useState('')
    const {tenantId} = useTenant()
    const { getProject, deleteProject, activeProject } = useTenant()
    const navigate = useNavigate()

    const reloadProject = async (id: number) => {
        try {
            setIsLoading(true);
            if (!id){
                return;
            }
            setProject(await getProject(id))
        } catch (e) {
            notifyApiError(e)
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (!tenantId){
            return
        }

        reloadProject(tenantId).then(undefined)
    }, [tenantId]);

    const onSave = async (project: TenantDto) => {
        if (!tenantId){
            throw Error("unreachable")
        }

        try {
            setIsLoading(true)
            setError('')

            await api.post('projects/project', project)
            await reloadProject(tenantId!)
            toast.success("Project settings saved")
        } catch (e){
            // @ts-ignore
            setError((e as AxiosError).response?.data?.message ?? "")
        } finally {
            setIsLoading(false)
        }
    }

    const onDelete = async () => {
        if (!tenantId){
            throw Error("unreachable")
        }

        try {
            setIsLoading(true)
            setError('')

            const pid = tenantId!
            await deleteProject(pid)
            if ((activeProject?.id ?? null) === pid){
                navigate('/')
            }

            toast.success("Project deleted")
            navigate("/projects/browser")
        } catch (e){
            // @ts-ignore
            setError((e as AxiosError).response?.data?.message ?? "")
        } finally {
            setIsLoading(false)
        }
    }

    return <MainLayout>
        <ConfirmationDialog confirmationOpened={confirmDeleteOpened}
                            setConfirmationOpened={setConfirmDeleteOpened}
                            onAccepted={onDelete}
                            title={'Delete project'}
                            message={'Are you sure you want to delete this project? This action is irreversible.'}
                            acceptText={'Delete'}
                            destructive/>
        { isLoading ? <FullSizeSpinner/> : !project ? <div className={"flex flex-col flex-grow w-full justify-center gap-2"}>
            <div className={"w-full flex flex-row justify-center"}>
                <Label className={"text-foreground font-bold text-4xl"}>
                    Tenant not found
                </Label>
            </div>
        </div> : <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-foreground font-bold"}>
                    Manage tenant
                </Label>
            </div>
            <div className={"w-full"}>
                <div className={"lg:w-1/2 text-foreground flex flex-col gap-2"}>
                    <ProjectEditForm submissionText={"Save"}
                                     error={error}
                                     isLoading={isLoading}
                                     onSave={onSave}
                                     project={project}/>
                    <Button className={"cursor-pointer bg-destructive text-background border-destructive border-1 hover:bg-background hover:text-destructive"} onClick={() => setConfirmDeleteOpened(true)}>Delete project</Button>
                </div>
            </div>
        </div> }
    </MainLayout>
}

export default TenantDetailsPage