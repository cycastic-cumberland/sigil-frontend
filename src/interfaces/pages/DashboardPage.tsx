import AppSidebar from "@/interfaces/components/AppSidebar.tsx";
import {SidebarProvider} from "@/components/ui/sidebar.tsx";

const DashboardPage = () => {
    return <div className={"min-h-svh w-full hidden md:flex"}>
        <SidebarProvider>
            <AppSidebar/>
            <div className={"bg-foreground relative flex w-full flex-1 flex-col md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2"}>
                <div className={"w-full flex"}></div>
            </div>
        </SidebarProvider>
    </div>
}

export default DashboardPage