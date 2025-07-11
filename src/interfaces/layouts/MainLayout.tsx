import {type FC, type ReactNode} from "react";
import AppSidebar from "@/interfaces/components/AppSidebar.tsx";
import ProjectSelector from "@/interfaces/components/ProjectSelector.tsx";
import DecryptPrivateKeyOverlay from "@/interfaces/layouts/DecryptPrivateKeyOverlay.tsx";

const MainLayout: FC<{ children?: ReactNode | ReactNode[] }> = ({ children }) => {
    return <DecryptPrivateKeyOverlay>
        <div className={"w-full flex min-w-sm"}>
            <AppSidebar/>
            <div className={"bg-background relative flex w-full flex-1 flex-col md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2"}>
                <ProjectSelector/>
                { children }
            </div>
        </div>
    </DecryptPrivateKeyOverlay>
}

export default MainLayout