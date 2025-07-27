import {useTenant} from "@/contexts/TenantContext.tsx";
import {Label} from "@/components/ui/label.tsx";
import {useSidebar} from "@/components/ui/sidebar.tsx";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {Lock, LockOpen, Menu} from "lucide-react";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Button} from "@/components/ui/button.tsx";
import {useState} from "react";
import DecryptPrivateKeyDialog from "@/interfaces/components/PrivateKeyDecryptionDialog.tsx";

const UserUnlocked = () => {
    return <Tooltip>
        <TooltipTrigger asChild><LockOpen size={15}/></TooltipTrigger>
        <TooltipContent>
            <p>User's private key decrypted</p>
        </TooltipContent>
    </Tooltip>
}

const UserLocked = () => {
    const [openDialog, setOpenDialog] = useState(false)

    return <>
        <DecryptPrivateKeyDialog openDialog={openDialog}
                                 onReject={() => setOpenDialog(false)}
                                 onComplete={() => setOpenDialog(false)}/>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    className="cursor-pointer group text-destructive hover:text-destructive"
                    variant={"outline"}
                    onClick={() => setOpenDialog(true)}
                >
                    <div className="relative flex items-center justify-center w-full">
                        <Lock
                            size={15}
                            className="transform transition duration-300 group-hover:mr-2"
                        />
                        <p className="overflow-hidden whitespace-nowrap w-0 opacity-0 transition-[width,opacity,margin] duration-300 group-hover:w-auto group-hover:opacity-100">
                            Encrypted
                        </p>
                    </div>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>User's private key encrypted</p>
            </TooltipContent>
        </Tooltip>
    </>
}

const AppTopBar = () => {
    const {activeTenant} = useTenant()
    const {toggleSidebar} = useSidebar()
    const {userPrivateKey} = useAuthorization()
    const isDesktop = useMediaQuery("(min-width: 768px)")

    return <div className={"w-full flex flex-row bg-background border-b border-sidebar min-h-16"}>
        { !isDesktop && <button className={"gap-2 p-2 appearance-none bg-transparent border-none m-0 focus:outline-none cursor-pointer"} onClick={toggleSidebar}>
            <div className={"flex flex-row py-1 m-0"}>
                <div className={"flex flex-col"}>
                    <h1 className={"text-2xl font-semibold tracking-tight invisible"}>
                        T
                    </h1>
                </div>
                <Menu size={30}/>
            </div>
        </button> }
        <div className={`flex items-center gap-2 ${isDesktop ? 'ml-5' : ''}`}>
            { userPrivateKey ? <UserUnlocked/> : <UserLocked/> }
            {activeTenant && (
                <Label className="text-foreground font-bold text-xl">
                    {activeTenant.tenantName}
                </Label>
            )}
        </div>
    </div>
}

export default AppTopBar;