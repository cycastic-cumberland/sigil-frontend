import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import {useEffect, useState} from "react";
import type {ProjectDto} from "@/dto/ProjectDto.ts";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import {useNavigate, useParams} from "react-router";
import {useProject} from "@/contexts/ProjectContext.tsx";
import ProjectEditForm from "@/interfaces/components/ProjectEditForm.tsx";
import api from "@/api.tsx";
import type {AxiosError} from "axios";
import ConfirmationDialog from "@/interfaces/components/ConfirmationDialog.tsx";
import {Button} from "@/components/ui/button.tsx";

const ProjectDetailsPage = () => {
    const [project, setProject] = useState(null as ProjectDto | null)
    const [isLoading, setIsLoading] = useState(true)
    const [confirmDeleteOpened, setConfirmDeleteOpened] = useState(false)
    const [error, setError] = useState('')
    const { id } = useParams()
    const { getProject, deleteProject, activeProject, changeActiveProject } = useProject()
    const navigate = useNavigate()

    const reloadProject = async (id: number) => {
        try {
            setIsLoading(true);
            if (!id){
                return;
            }
            setProject(await getProject(id))
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (!id){
            return
        }

        reloadProject(Number(id)).then(undefined)
    }, [id]);

    const onSave = async (project: ProjectDto) => {
        if (!id){
            throw Error("unreachable")
        }

        try{
            setIsLoading(true)
            setError('')

            await api.post('projects/project', project)
            await reloadProject(Number(id))
        } catch (e){
            // @ts-ignore
            setError((e as AxiosError).response?.data?.message ?? "")
        } finally {
            setIsLoading(false)
        }
    }

    const onDelete = async () => {
        if (!id){
            throw Error("unreachable")
        }

        try{
            setIsLoading(true)
            setError('')

            const pid = Number(id)
            await deleteProject(pid)
            if ((activeProject?.id ?? null) === pid){
                changeActiveProject(null)
            }
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
                <Label className={"text-secondary font-bold text-4xl"}>
                    Project not found
                </Label>
            </div>
        </div> : <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-secondary font-bold"}>
                    { project.projectName }
                </Label>
            </div>
            <div className={"w-full"}>
                <div className={"lg:w-1/2 text-secondary flex flex-col gap-2"}>
                    <ProjectEditForm submissionText={"Save"}
                                     error={error}
                                     isLoading={isLoading}
                                     onSave={onSave}
                                     project={project}/>
                    <Button className={"cursor-pointer bg-destructive"} onClick={() => setConfirmDeleteOpened(true)}>Delete project</Button>
                </div>
            </div>
        </div> }
    </MainLayout>
}

export default ProjectDetailsPage