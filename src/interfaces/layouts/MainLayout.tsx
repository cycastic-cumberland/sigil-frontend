import {type FC, type ReactNode} from "react";
import AppSidebar from "@/interfaces/components/AppSidebar.tsx";
import AppTopBar from "@/interfaces/components/AppTopBar.tsx";

const MainLayout: FC<{
    children?: ReactNode | ReactNode[],
}> = ({ children }) => {
    return <div className={"w-full flex min-w-sm"}>
        <AppSidebar/>
        <div className={"bg-background min-h-screen relative flex w-full flex-1 flex-col md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2"}>
            <AppTopBar/>
            { children }
        </div>
    </div>
}

export default MainLayout