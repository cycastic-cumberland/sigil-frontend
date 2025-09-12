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
import {faker} from '@faker-js/faker';
import {KanbanBoard, KanbanCard, KanbanCards, KanbanHeader, KanbanProvider} from "@/components/ui/shadcn-io/kanban";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {useConsent} from "@/contexts/ConsentContext.tsx";

type RequireEncryptionKey = {
    userPrivateKey: CryptoKey
}

const extractPath = (path: string): string => {
    let subPath = path.replace(/^\/tenant\/[^/]+\/project\/overview\/?/, '');
    subPath = decodeURIComponent(subPath)
    subPath = subPath ? subPath : '/'
    subPath = subPath.endsWith('/') ? subPath.slice(0, -1) : subPath
    subPath = subPath.startsWith('/') ? subPath : ('/' + subPath)
    return subPath
}

const columns = [
    { id: crypto.randomUUID(), name: 'Planned', color: '#6B7280' },
    { id: crypto.randomUUID(), name: 'In Progress', color: '#F59E0B' },
    { id: crypto.randomUUID(), name: 'Done', color: '#10B981' },
];

const users = Array.from({ length: 4 })
    .fill(null)
    .map(() => ({
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        image: faker.image.avatar(),
    }));

const exampleFeatures = Array.from({ length: 20 })
    .fill(null)
    .map(() => ({
        id: crypto.randomUUID(),
        name: faker.company.buzzPhrase(),
        startAt: faker.date.past({ years: 0.5, refDate: new Date() }),
        endAt: faker.date.future({ years: 0.5, refDate: new Date() }),
        column: faker.helpers.arrayElement(columns).id,
        owner: faker.helpers.arrayElement(users),
    }));

const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
});

const ExampleKanban = () => {
    const [features, setFeatures] = useState(exampleFeatures);

    return <>
        <KanbanProvider
            columns={columns}
            data={features}
            onDataChange={setFeatures}
            className={"max-w-fit mt-3"}
        >
            {(column) => (
                <KanbanBoard id={column.id} key={column.id} className={"max-w-fit min-w-36"}>
                    <KanbanHeader>
                        <div className="flex items-center gap-2">
                            <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: column.color }}
                            />
                            <span>{column.name}</span>
                        </div>
                    </KanbanHeader>
                    <KanbanCards id={column.id}>
                        {(feature: (typeof features)[number]) => (
                            <KanbanCard
                                column={column.id}
                                id={feature.id}
                                key={feature.id}
                                name={feature.name}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-col gap-1">
                                        <p className="m-0 flex-1 font-medium text-sm">
                                            {feature.name}
                                        </p>
                                    </div>
                                    {/*{feature.owner && (*/}
                                    {/*    <Avatar className="h-4 w-4 shrink-0">*/}
                                    {/*        <AvatarImage src={feature.owner.image} />*/}
                                    {/*        <AvatarFallback>*/}
                                    {/*            {feature.owner.name?.slice(0, 2)}*/}
                                    {/*        </AvatarFallback>*/}
                                    {/*    </Avatar>*/}
                                    {/*)}*/}
                                </div>
                                <p className="m-0 text-muted-foreground text-xs">
                                    {shortDateFormatter.format(feature.startAt)} -{' '}
                                    {dateFormatter.format(feature.endAt)}
                                </p>
                            </KanbanCard>
                        )}
                    </KanbanCards>
                </KanbanBoard>
            )}
        </KanbanProvider>
    </>
};

const ProjectDetails: FC<RequireEncryptionKey & {
    project: ProjectPartitionDto,
}> = () => {
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
                        <div className={"min-w-fit flex flex-row"}>
                            <ExampleKanban/>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="kanban-boards" className={"w-full"}>
                    <div className={"w-full"}>Password</div>
                </TabsContent>
                <TabsContent value="backlog" className={"w-full"}>
                    <div className={"w-full"}>Password</div>
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
        {userPrivateKey && <PartitionLoaderStub userPrivateKey={userPrivateKey}/>}
    </MainLayout>
}

export default ProjectOverviewPage