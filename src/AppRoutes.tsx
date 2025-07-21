import type {ReactNode} from "react";
import DashboardPage from "@/interfaces/pages/DashboardPage.tsx";
import LoginPage from "@/interfaces/pages/LoginPage.tsx";
import PartitionsBrowserPage from "@/interfaces/pages/partitions/PartitionsBrowserPage.tsx";
import TenantBrowserPage from "@/interfaces/pages/tenants/TenantBrowserPage.tsx";
import TenantDetailsPage from "@/interfaces/pages/tenants/TenantDetailsPage.tsx";
import RegisterPage from "@/interfaces/pages/RegisterPage.tsx";
import CompleteSignupPage from "@/interfaces/pages/CompleteSignupPage.tsx";
import PartitionMembersPage from "@/interfaces/pages/partitions/PartitionMembersPage.tsx";
import SelfDetailsPage from "@/interfaces/pages/users/SelfDetailsPage.tsx";
import TenantMemberPage from "@/interfaces/pages/tenants/TenantMemberPage.tsx";
import PartitionManagementPage from "@/interfaces/pages/partitions/PartitionManagementPage.tsx";

export type RouteInfo = { index?: boolean, isPrivate: boolean, path?: string, element: ReactNode };

export const AppRoutes : RouteInfo[] = [
    {
        index: true,
        isPrivate: true,
        element: <DashboardPage/>
    },
    {
        isPrivate: false,
        path: "/login",
        element: <LoginPage/>
    },
    {
        isPrivate: false,
        path: "/register",
        element: <RegisterPage/>
    },
    {
        isPrivate: false,
        path: "/complete-signup",
        element: <CompleteSignupPage/>
    },
    {
        isPrivate: true,
        path: "/tenant/browser",
        element: <TenantBrowserPage/>
    },
    {
        isPrivate: true,
        path: "/tenant/:tenantId/manage",
        element: <TenantDetailsPage/>
    },
    {
        isPrivate: true,
        path: "/tenant/:tenantId/members",
        element: <TenantMemberPage/>
    },
    {
        isPrivate: true,
        path: "/tenant/:tenantId/partitions/browser/*",
        element: <PartitionsBrowserPage/>
    },
    {
        isPrivate: true,
        path: "/tenant/:tenantId/partitions/members/*",
        element: <PartitionMembersPage/>
    },
    {
        isPrivate: true,
        path: "/tenant/:tenantId/partitions/manage",
        element: <PartitionManagementPage/>
    },
    {
        isPrivate: true,
        path: "/users/self",
        element: <SelfDetailsPage/>
    },
]