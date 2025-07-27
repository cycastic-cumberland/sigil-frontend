import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Plus} from "lucide-react";
import {type FC, useEffect, useState} from "react";
import TenantTable from "@/interfaces/components/TenantTable.tsx";
import {useNavigate} from "react-router";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import type {TenantDto} from "@/dto/TenantDto.ts";
import TenantEditForm from "@/interfaces/components/TenantEditForm.tsx";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Drawer, DrawerContent, DrawerHeader} from "@/components/ui/drawer.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {notifyApiError} from "@/utils/errors.ts";
import {toast} from "sonner";
import {useTenant} from "@/contexts/TenantContext.tsx";

const CreateTenantDialog: FC<{
    isLoading: boolean,
    setIsLoading: (l: boolean) => void,
    opened: boolean,
    setOpened: (o: boolean) => void,
    reloadTrigger: () => void,
}> = ({ isLoading, setIsLoading, opened, setOpened, reloadTrigger }) => {
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const navigate = useNavigate()
    const {saveTenant} = useTenant()

    const onSave = async (tenant: TenantDto) => {
        try {
            setIsLoading(true)

            const data = await saveTenant(tenant)
            toast.success('Tenant created')
            navigate(`/tenant/${encodeURIComponent(data.id)}/partitions/browser/`)

            reloadTrigger()
            setOpened(false)
        } catch (e){
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    return isDesktop ? <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Create tenant</DialogTitle>
            </DialogHeader>
            <div className={"w-full"}>
                <TenantEditForm isLoading={isLoading} onSave={onSave}/>
            </div>
        </DialogContent>
    </Dialog> : <Drawer open={opened} onOpenChange={setOpened}>
        <DrawerContent>
            <DrawerHeader>Create tenant</DrawerHeader>
            <div className={"w-full px-3 pb-3"}>
                <TenantEditForm isLoading={isLoading} onSave={onSave}/>
            </div>
        </DrawerContent>
    </Drawer>
}

const TenantBrowserPage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [dialogOpened, setDialogOpened] = useState(false)
    const [canCreateTenant, setCanCreateTenant] = useState(null as boolean | null)
    const [counter, setCounter] = useState(0)
    const {getUserInfo} = useAuthorization()
    const navigate = useNavigate()

    useEffect(() => {
        (async () => {
            try {
                setIsLoading(true)
                const u = await getUserInfo(true)
                setCanCreateTenant(u.roles.includes("ADMIN") || u.tenantOwnerCount === 0)
            } finally {
                setIsLoading(false)
            }
        })()
    }, [counter]);

    const getLink = (t: TenantDto) => {
        return `/tenant/${t.id}/manage`
    }

    const reloadTrigger = () => setCounter(c => c + 1)

    const createTenantButton = <Button className={"text-foreground border-dashed border-2 border-foreground cursor-pointer " +
        "hover:border-solid hover:text-background hover:bg-foreground"}
                           disabled={isLoading || !canCreateTenant}
                           onClick={() => {
                               setDialogOpened(true)
                           }}>
        {isLoading ? <Spinner/> : <Plus/>}
        <span>Create tenant</span>
    </Button>;

    return <MainLayout>
        <CreateTenantDialog isLoading={isLoading}
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
                {canCreateTenant === null || canCreateTenant
                    ? createTenantButton
                    : <Tooltip>
                        <TooltipTrigger>
                            {createTenantButton}
                        </TooltipTrigger>
                        <TooltipContent>
                            Tenant ownership limit exceeded
                        </TooltipContent>
                    </Tooltip>}
            </div>
            <div className={"my-3 w-full"}>
                <TenantTable key={counter}
                             isLoading={isLoading}
                             setIsLoading={setIsLoading}
                             getRowLink={getLink}
                             onSelect={(t) => {
                                 navigate(getLink(t))
                             }}/>
            </div>
        </div>
    </MainLayout>
}

export default TenantBrowserPage
