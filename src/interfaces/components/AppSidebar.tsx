import {useEffect, useState} from "react";
import api from "@/api.tsx";
import type {UserInfoDto} from "@/dto/UserInfoDto.ts";
import {Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader} from "@/components/ui/sidebar.tsx";


const AppSidebar = () => {
    const [avatarUrl, setAvatarUrl] = useState("https://ui-avatars.com/api/?name=John+Doe")
    const [selfInfo, setSelfInfo] = useState(null as UserInfoDto | null)

    useEffect(() => {
        (async () => {
            const response = await api.get("auth/self")
            const myInfo = response.data as UserInfoDto
            setSelfInfo(myInfo)
            setAvatarUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(`${myInfo.firstName} ${myInfo.lastName}`)}`)
        })()
    }, []);

    return  <Sidebar className={"bg-primary"}>
        <SidebarHeader className={"bg-primary"} />
        <SidebarContent className={"bg-primary"}>
            <SidebarGroup />
        </SidebarContent>
        <SidebarFooter className={"bg-primary"}>
            <ul className={"flex w-full min-w-0 flex-col gap-1"}>
                <button className={"w-full flex flex-row appearance-none bg-transparent border-none p-0 m-0 hover:bg-sidebar-accent"}>
                    <span className={"relative flex size-8 shrink-0 overflow-hidden h-8 w-8 rounded-lg"}>
                        <img src={avatarUrl} alt={"pfp"}/>
                    </span>
                    <div className={"grid flex-1 ml-2 text-left text-sm leading-tight"}>
                        <span className={"truncate font-medium text-secondary"}>
                            { selfInfo !== null ? `${selfInfo.firstName} ${selfInfo.lastName}` : '' }
                        </span>
                        <span className={"text-muted-foreground truncate text-xs"}>
                            { selfInfo?.email }
                        </span>
                    </div>
                </button>
            </ul>
        </SidebarFooter>
    </Sidebar>
}

export default AppSidebar;