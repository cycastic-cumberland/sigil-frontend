import {type ReactNode, useEffect, useMemo, useState} from "react";
import type {UserInfoDto} from "@/dto/user/UserInfoDto.ts";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup, SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar
} from "@/components/ui/sidebar.tsx";
import {DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem} from "@/components/ui/dropdown-menu.tsx";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {
    Bell,
    BellDot,
    Building2,
    Folder, List,
    Menu, Triangle,
    Users, Wrench
} from "lucide-react";
import {Link, useLocation} from "react-router";
import {useTheme} from "@/contexts/ThemeContext.tsx";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {useTenant} from "@/contexts/TenantContext.tsx";
import {format} from "@/utils/format.ts";
import {cn} from "@/lib/utils.ts";
import {useNotification} from "@/contexts/NotificationContext.tsx";
import {getUserRole} from "@/utils/auth.ts";

const NotificationIcon = () => {
    const {notificationCount} = useNotification()
    return notificationCount ? <BellDot/> : <Bell/>
}

const NotificationTitle = () => {
    const {notificationCount} = useNotification()

    return notificationCount ? <>Notifications ({notificationCount})</> : <>Notifications</>
}

type MenuGroup = {
    title: string,
    items: {name: string | ReactNode, icon?: ReactNode, url: string}[]
}

const startingMenuGroups: MenuGroup[] = [
    {
        title: "User",
        items: [
            {
                name: "Select tenant",
                url: '/',
                icon: <List/>
            },
            {
                name: "Active tenants",
                url: '/tenant/browser',
                icon: <Building2/>
            },
            {
                name: <NotificationTitle/>,
                url: '/notifications',
                icon: <NotificationIcon/>
            },
        ]
    },
]

const fullMenuGroups: MenuGroup[] = [
    {
        title: "User",
        items: [
            {
                name: <NotificationTitle/>,
                url: '/notifications',
                icon: <NotificationIcon/>
            },
        ]
    },
    {
        title: "Tenant",
        items: [
            {
                name: "Members",
                url: '/tenant/{}/members',
                icon: <Users/>
            },
            {
                name: "Details",
                url: '/tenant/{}/manage',
                icon: <Wrench/>
            },
        ]
    },
    {
        title: "Partitions",
        items: [
            {
                name: "Browser",
                url: '/tenant/{}/partitions/browser',
                icon: <Folder/>
            },
        ]
    }
]

const AdminMenuGroups: MenuGroup[] = [
    {
        title: "Admin",
        items: [
            {
                name: "Users",
                url: '/admin/users',
                icon: <Users/>,
            },
            {
                name: "Tenants",
                url: '/admin/tenants',
                icon: <Building2/>
            },
        ]
    }
]

const AdminMenuGroupsAlternate: MenuGroup[] = [
    {
        title: "Admin",
        items: [
            {
                name: "Entitlements",
                url: '/admin/entitlements/{}',
                icon: <Triangle/>
            }
        ]
    }
]

const AppSidebar = () => {
    const [avatarUrl, setAvatarUrl] = useState(null as string | null)
    const {localLogout, getUserInfo} = useAuthorization()
    const [selfInfo, setSelfInfo] = useState(null as UserInfoDto | null)
    const {theme, setTheme} = useTheme()
    const {tenantId} = useTenant()
    const {state, setOpenMobile} = useSidebar()
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const location = useLocation()
    const menuGroups = useMemo(() => {
        const groups = tenantId ? fullMenuGroups : startingMenuGroups;
        if ((getUserRole() ?? []).includes("ADMIN")){
            const adminGroups = tenantId ? AdminMenuGroupsAlternate : AdminMenuGroups
            return [
                ...groups,
                ...adminGroups
            ]
        }

        return [
            ...groups
        ]
    }, [tenantId])

    useEffect(() => {
        (async () => {
            const myInfo = await getUserInfo()
            setSelfInfo(myInfo)
            setAvatarUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(`${myInfo.firstName} ${myInfo.lastName}`)}`)
        })()
    }, []);

    useEffect(() => {
        if (!isDesktop){
            setOpenMobile(false)
        }
    }, [location, isDesktop]);

    const toggleTheme = () => {
        if (theme === 'system' || theme === 'light'){
            setTheme('dark')
        } else {
            setTheme('light')
        }
    }

    return  <Sidebar className={"bg-sidebar-accent border-r border-sidebar"} collapsible="icon">
        <SidebarHeader className={"bg-sidebar-accent flex flex-col justify-center border-b border-sidebar min-h-16"}>
            { state === 'expanded' ? <Link to={tenantId ? `/tenant/${tenantId}/partitions/browser/` : '/'} className={"w-full flex flex-row px-5 py-1 appearance-none bg-transparent border-none m-0 focus:outline-none"}>
                <img className={"w-8 aspect-square"} src={theme === 'dark' ? '/icon-dark.svg' : "/icon-light.svg"} alt={"logo"}/>
                <div className={"w-full flex flex-col"}>
                    <h1 className={"text-2xl font-semibold tracking-tight text-foreground ml-2"}>
                        Sigil
                    </h1>
                </div>
            </Link> : <Link to={'/'}><img className={"w-8 aspect-square"} src={theme === 'dark' ? '/icon-dark.svg' : "/icon-light.svg"} alt={"logo"}/></Link> }
        </SidebarHeader>
        <SidebarContent className={"bg-sidebar-accent"}>
            { menuGroups.map((mg, i) => <SidebarGroup key={i}>
                <SidebarGroupLabel className={"text-foreground"}>{ mg.title }</SidebarGroupLabel>
                <SidebarGroupContent className={"text-foreground"}>
                    <SidebarMenu>
                        { mg.items.map((mi, j) => <SidebarMenuItem key={j}>
                            <SidebarMenuButton asChild>
                                <Link to={format(mi.url, tenantId)} className={"hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"}>
                                    { mi.icon }
                                    <span>{ mi.name }</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>) }
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>) }
        </SidebarContent>
        <SidebarFooter className={"bg-sidebar-accent"}>
            <ul className={"flex w-full min-w-0 flex-row gap-1"}>
                { state === 'expanded' && <Link to={"/users/self"} className={"w-full flex flex-row m-0"}>
                    <span className={cn("relative flex size-8 shrink-0 overflow-hidden h-8 w-8 rounded-lg", !avatarUrl ? 'invisible' : '')}>
                        <img src={avatarUrl ?? "https://ui-avatars.com/api/?name=John+Doe"} alt={"pfp"}/>
                    </span>
                    <div className={"grid flex-1 ml-2 text-left text-sm leading-tight"}>
                        <span className={"truncate font-medium text-foreground"}>
                            { selfInfo !== null ? `${selfInfo.firstName} ${selfInfo.lastName}` : '' }
                        </span>
                        <span className={"text-muted-foreground truncate text-xs"}>
                            { selfInfo?.email }
                        </span>
                    </div>
                </Link> }
                <div className={"min-w-fit"}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-md hover:bg-muted-foreground cursor-pointer" aria-label="Open menu">
                                <div className={"w-5 h-5 text-foreground text-center justify-center flex flex-col"}>
                                    { state === 'expanded' ? '⋮' : <Menu size={20}/> }
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className={"cursor-pointer"} onSelect={toggleTheme}>
                                { theme === 'light' ? "Dark mode" : "Light mode" }
                            </DropdownMenuItem>
                            <DropdownMenuItem className={"cursor-pointer"} asChild>
                                <Link to={'/'}>
                                    Select tenant
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className={"cursor-pointer"} asChild>
                                <Link to={'/tenant/browser'}>
                                    Active tenants
                                </Link>
                            </DropdownMenuItem>
                            { state === 'collapsed' && <DropdownMenuItem className={"cursor-pointer"} asChild>
                                <Link to={'/users/self'}>
                                    Profile
                                </Link>
                            </DropdownMenuItem> }
                            <DropdownMenuItem className={"cursor-pointer"} onSelect={localLogout}>
                                Log out
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