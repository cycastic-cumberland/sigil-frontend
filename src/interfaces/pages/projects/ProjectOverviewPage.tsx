import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import {notifyApiError} from "@/utils/errors.ts";
import {useLocation, useNavigate} from "react-router";
import {useTenant} from "@/contexts/TenantContext.tsx";
import {type FC, useEffect, useState} from "react";
import api from "@/api.ts";
import {formatQueryParameters} from "@/utils/format.ts";
import {isProjectPartition, type PartitionDto, type ProjectPartitionDto} from "@/dto/tenant/PartitionDto.ts";
import {toast} from "sonner";

const extractPath = (path: string): string => {
    let subPath = path.replace(/^\/tenant\/[^/]+\/project\/overview\/?/, '');
    subPath = decodeURIComponent(subPath)
    subPath = subPath ? subPath : '/'
    subPath = subPath.endsWith('/') ? subPath.slice(0, -1) : subPath
    subPath = subPath.startsWith('/') ? subPath : ('/' + subPath)
    return subPath
}

const ProjectDetails: FC<{
    project: ProjectPartitionDto
}> = () => {
    return <>
    </>
}

const ProjectOverviewPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const {tenantId} = useTenant()
    const [projectDto, setProjectDto] = useState(null as ProjectPartitionDto | null)

    const redirect = async (path: string) => {
        try {
            const partitionPath = extractPath(path)
            const response = await api.get(formatQueryParameters('partitions/partition', {
                partitionPath
            }))
            const partitionDto = response.data as PartitionDto
            if (!isProjectPartition(partitionDto)){
                toast.error('This partition is not a project partition')
                navigate(`/tenant/${tenantId}/partitions/browser/`)
                return
            }

            setProjectDto(partitionDto)
        } catch (e){
            notifyApiError(e)
            navigate(`/tenant/${tenantId}/partitions/browser/`)
        }
    }

    useEffect(() => {
        redirect(location.pathname).then(undefined)
    }, [location]);

    return <MainLayout>
        <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-foreground font-bold"}>
                    Project overview
                </Label>
            </div>
            {projectDto && <ProjectDetails project={projectDto}/>}
        </div>
    </MainLayout>
}

export default ProjectOverviewPage