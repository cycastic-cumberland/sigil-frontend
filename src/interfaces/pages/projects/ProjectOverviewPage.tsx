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
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {KanbanSquare, List, Rows3} from "lucide-react";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {useConsent} from "@/contexts/ConsentContext.tsx";
import type {RequireEncryptionKey} from "@/utils/cryptography.ts";
import ProjectOverviewPageKanbanBoards from "@/interfaces/pages/projects/ProjectOverviewPage.KanbanBoards.tsx";

const extractPath = (path: string): string => {
    let subPath = path.replace(/^\/tenant\/[^/]+\/project\/overview\/?/, '');
    subPath = decodeURIComponent(subPath)
    subPath = subPath ? subPath : '/'
    subPath = subPath.endsWith('/') ? subPath.slice(0, -1) : subPath
    subPath = subPath.startsWith('/') ? subPath : ('/' + subPath)
    return subPath
}

const ProjectDetails: FC<RequireEncryptionKey & {
    project: ProjectPartitionDto,
}> = (props) => {
    return <>
        <div className="flex w-full flex-col gap-6 my-2">
            <Tabs defaultValue="kanban-boards">
                <TabsList className={"max-w-fit"}>
                    <TabsTrigger className={'cursor-pointer'} value="kanban-boards"><KanbanSquare/>Kanban boards</TabsTrigger>
                    <TabsTrigger className={'cursor-pointer'} value="all-sprints"><List/>All sprints</TabsTrigger>
                    <TabsTrigger className={'cursor-pointer'} value="backlog"><Rows3/>Backlog</TabsTrigger>
                </TabsList>
                <TabsContent value="all-sprints">
                    <div className={"w-full overflow-x-auto"}>
                    </div>
                </TabsContent>
                <TabsContent value="kanban-boards" className={"w-full"}>
                    <ProjectOverviewPageKanbanBoards {...props}/>
                </TabsContent>
                <TabsContent value="backlog" className={"w-full"}>
                    <div className={"w-full"}></div>
                </TabsContent>
            </Tabs>
        </div>
    </>
}

const PartitionLoaderStub: FC<RequireEncryptionKey> = ({userPrivateKey}) => {
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

    return <div className={"w-full px-5 py-2 flex flex-col"}>
        <div className={"my-2"}>
            <Label className={"text-2xl text-foreground font-bold"}>
                {projectDto ? projectDto.partitionPath.split('/').filter(s => s).pop() : "Project overview"}
            </Label>
        </div>
        {projectDto && <ProjectDetails project={projectDto} userPrivateKey={userPrivateKey}/>}
    </div>
}

const ProjectOverviewPage = () => {
    const {userPrivateKey} = useAuthorization()
    const {requireDecryption} = useConsent()

    useEffect(() => {
        requireDecryption()
            .catch(notifyApiError)
    }, []);

    return <MainLayout>
        {userPrivateKey
            ? <PartitionLoaderStub userPrivateKey={userPrivateKey}/>
            : <div className={"flex flex-col flex-grow w-full justify-center gap-2"}>
                <div className={"w-full flex flex-row justify-center"}>
                    <Label className={"text-foreground font-bold text-4xl"}>
                        Project data locked
                    </Label>
                </div>
                <div className={"w-full flex flex-row justify-center"}>
                    <p className={"text-muted-foreground px-2 text-center"}>
                        Your data is locked. Tap the padlock above to unlock.
                    </p>
                </div>
            </div>}
    </MainLayout>
}

export default ProjectOverviewPage