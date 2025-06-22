import {type ReactNode, useEffect, useState} from "react";
import api from "@/api.tsx";
import type {UserInfoDto} from "@/dto/UserInfoDto.ts";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup, SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar
} from "@/components/ui/sidebar.tsx";
import {DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem} from "@/components/ui/dropdown-menu.tsx";
import {getAuth} from "@/utils/auth.ts";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {Construction, Folder, LayoutTemplate, Lock, Mail, Menu, Telescope} from "lucide-react";
import {Link, useLocation} from "react-router";
import {useTheme} from "@/contexts/ThemeContext.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {Label} from "@/components/ui/label.tsx";
import useMediaQuery from "@/hooks/use-media-query.tsx";

type MenuGroup = {
    title: string,
    items: {name: string, icon: ReactNode, url: string}[]
}

const fullMenuGroups: MenuGroup[] = [
    {
        title: "Projects",
        items: [
            {
                name: "All projects",
                url: '/projects/browser',
                icon: <Construction/>
            },
        ]
    },
    {
        title: "Listings",
        items: [
            {
                name: "Browser",
                url: '/listings/browser',
                icon: <Folder/>
            },
        ]
    },
    {
        title: "Emails",
        items: [
            {
                name: "Templates",
                url: '/emails/templates',
                icon: <LayoutTemplate/>
            },
            {
                name: "Queue",
                url: '/emails/queue',
                icon: <Mail/>
            },
            {
                name: "SMTP credentials",
                url: '/emails/credentials',
                icon: <Lock/>
            },
            {
                name: "Telemetry",
                url: '/emails/telemetry',
                icon: <Telescope/>
            },
        ]
    }
]

const AppSidebar = () => {
    const [avatarUrl, setAvatarUrl] = useState("https://ui-avatars.com/api/?name=John+Doe")
    const [selfInfo, setSelfInfo] = useState(null as UserInfoDto | null)
    const {theme, setTheme} = useTheme()
    const {invalidateAllSessions, localLogout} = useAuthorization()
    const {state, setOpenMobile} = useSidebar()
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const location = useLocation();

    useEffect(() => {
        (async () => {
            const response = await api.get("auth/self")
            const myInfo = response.data as UserInfoDto
            setSelfInfo(myInfo)
            setAvatarUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(`${myInfo.firstName} ${myInfo.lastName}`)}`)
        })()
    }, []);

    useEffect(() => {
        if (!isDesktop){
            setOpenMobile(false)
        }
    }, [location, isDesktop]);


    const invalidateSessions = async () => {
        const authInfo = getAuth()
        if (!authInfo){
            throw Error("unreachable");
        }
        await invalidateAllSessions(authInfo.userId)
        localLogout()
    }

    const toggleTheme = () => {
        if (theme === 'system' || theme === 'light'){
            setTheme('dark')
        } else {
            setTheme('light')
        }
    }

    return  <Sidebar className={"bg-primary border-r border-muted-foreground"} collapsible="icon">
        <SidebarHeader className={"bg-primary flex flex-col justify-center border-b border-muted-foreground min-h-16"}>
            { state === 'expanded' ? <Link to={"/"} className={"w-full flex flex-row px-5 py-1 appearance-none bg-transparent border-none m-0 focus:outline-none"}>
                <img className={"w-8 aspect-square"} src={"/icon.svg"} alt={"logo"}/>
                <div className={"w-full flex flex-col"}>
                    <h1 className={"text-2xl font-semibold tracking-tight text-secondary"}>
                        PortfolioToolkit
                    </h1>
                </div>
            </Link> : <Link to={'/'}><img className={"w-8 aspect-square"} src={"/icon.svg"} alt={"logo"}/></Link> }
        </SidebarHeader>
        <SidebarContent className={"bg-primary"}>
            { fullMenuGroups.map((mg, i) => <SidebarGroup key={i}>
                <SidebarGroupLabel className={"text-secondary"}>{ mg.title }</SidebarGroupLabel>
                <SidebarGroupContent className={"text-secondary"}>
                    <SidebarMenu>
                        { mg.items.map((mi, j) => <SidebarMenuItem key={j}>
                            <SidebarMenuButton asChild>
                                <Link to={mi.url}>
                                    { mi.icon }
                                    <span>{ mi.name }</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>) }
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>) }
        </SidebarContent>
        <SidebarFooter className={"bg-primary"}>
            <ul className={"flex w-full min-w-0 flex-row gap-1"}>
                { state === 'expanded' && <div className={"w-full flex flex-row m-0"}>
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
                </div> }
                <div className={"min-w-fit"}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-md hover:bg-muted-foreground cursor-pointer" aria-label="Open menu">
                                <div className={"w-5 h-5 text-secondary text-center justify-center flex flex-col"}>
                                    { state === 'expanded' ? '⋮' : <Menu size={20}/> }
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className={"cursor-pointer"} onSelect={toggleTheme}>
                                <div className={"flex flex-row"}>
                                    <Switch className={"cursor-pointer"} checked={theme === 'system' || theme === 'light'}/>
                                    <div className={"flex flex-col justify-center ml-2"}>
                                        <Label className={"text-primary"}>Dark mode</Label>
                                    </div>
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem className={"cursor-pointer"} onSelect={localLogout}>
                                Log out
                            </DropdownMenuItem>
                            <DropdownMenuItem className={"text-destructive cursor-pointer"} onSelect={invalidateSessions}>
                                Invalidate all sessions
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </ul>
        </SidebarFooter>
        { isDesktop && <SidebarRail /> }
    </Sidebar>
}

export default AppSidebar;