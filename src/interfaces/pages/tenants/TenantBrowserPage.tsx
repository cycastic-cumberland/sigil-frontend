import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Plus} from "lucide-react";
import {type FC, useState} from "react";
import TenantTable from "@/interfaces/components/TenantTable.tsx";
import {useNavigate} from "react-router";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import type {TenantDto} from "@/dto/TenantDto.ts";
import ProjectEditForm from "@/interfaces/components/ProjectEditForm.tsx";
import type {AxiosError} from "axios";
import api from "@/api.ts";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Drawer, DrawerContent, DrawerHeader} from "@/components/ui/drawer.tsx";

const CreateProjectDialog: FC<{
    isLoading: boolean,
    setIsLoading: (l: boolean) => void,
    opened: boolean,
    setOpened: (o: boolean) => void,
    reloadTrigger: () => void,
}> = ({ isLoading, setIsLoading, opened, setOpened, reloadTrigger }) => {
    const [error, setError] = useState('')
    const isDesktop = useMediaQuery("(min-width: 768px)")

    const onSave = async (project: TenantDto) => {
        try {
            setError('')
            setIsLoading(true)

            project.id = undefined
            await api.post('projects/project', project)
            reloadTrigger()
            setOpened(false)
        } catch (e){
            // @ts-ignore
            setError((e as AxiosError).response?.data?.message ?? "")
        } finally {
            setIsLoading(false)
        }
    }

    return isDesktop ? <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
            </DialogHeader>
            <div className={"w-full"}>
                <ProjectEditForm isLoading={isLoading} error={error} onSave={onSave}/>
            </div>
        </DialogContent>
    </Dialog> : <Drawer open={opened} onOpenChange={setOpened}>
        <DrawerContent>
            <DrawerHeader>Create project</DrawerHeader>
            <div className={"w-full px-3 pb-3"}>
                <ProjectEditForm isLoading={isLoading} error={error} onSave={onSave}/>
            </div>
        </DrawerContent>
    </Drawer>
}

const TenantBrowserPage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [dialogOpened, setDialogOpened] = useState(false)
    const [counter, setCounter] = useState(0)
    const navigate = useNavigate()

    const getLink = (t: TenantDto) => {
        return `/tenant/${t.id}/manage`
    }

    const reloadTrigger = () => setCounter(c => c + 1)

    return <MainLayout>
        <CreateProjectDialog isLoading={isLoading}
                             setIsLoading={setIsLoading}
                             opened={dialogOpened}
                             setOpened={setDialogOpened}
                             reloadTrigger={reloadTrigger}/>
        <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-foreground font-bold"}>
                    Active tenants
                </Label>
            </div>
            <div className={"my-3"}>
                <Button className={"text-foreground border-dashed border-2 border-foreground cursor-pointer " +
                    "hover:border-solid hover:text-background hover:bg-foreground"}
                        onClick={() => { setDialogOpened(true) }}>
                    <Plus/>
                    <span>Create project</span>
                </Button>
            </div>
            <div className={"my-3 w-full"}>
                <TenantTable key={counter}
                             isLoading={isLoading}
                             setIsLoading={setIsLoading}
                             getRowLink={getLink}
                             onSelect={(t) => { navigate(getLink(t)) }}/>
            </div>
        </div>
    </MainLayout>
}

export default TenantBrowserPage
