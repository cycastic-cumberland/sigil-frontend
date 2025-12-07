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
import CompleteTenantInvitationPage from "@/interfaces/pages/tenants/CompleteTenantInvitationPage.tsx";
import NotificationPage from "@/interfaces/pages/NotificationPage.tsx";
import ProjectOverviewPage from "@/interfaces/pages/projects/ProjectOverviewPage.tsx";
import TaskViewerPage from "@/interfaces/pages/projects/TaskViewerPage.tsx";
import TaskProgressionPage from "@/interfaces/pages/projects/TaskProgressionPage.tsx";
import AdminUsersPage from "@/interfaces/pages/admin/users/AdminUsersPage.tsx";
import AdminUserDetailsPage from "@/interfaces/pages/admin/users/AdminUserDetailsPage.tsx";
import AdminUserCreatePage from "@/interfaces/pages/admin/users/AdminUserCreatePage.tsx";
import AdminTenantsPage from "@/interfaces/pages/admin/tenants/AdminTenantsPage.tsx";
import AdminEntitlementsPage from "@/interfaces/pages/admin/entitlements/AdminEntitlementsPage.tsx";
import AdminEntitlementDetailsPage from "@/interfaces/pages/admin/entitlements/AdminEntitlementDetailsPage.tsx";
import AdminEntitlementCreatePage from "@/interfaces/pages/admin/entitlements/AdminEntitlementCreatePage.tsx";

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
        isPrivate: false,
        path: "/complete-tenant-invitation",
        element: <CompleteTenantInvitationPage/>
    },
    {
        isPrivate: true,
        path: "/notifications",
        element: <NotificationPage/>
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
    {
        isPrivate: true,
        path: "/tenant/:tenantId/project/overview/*",
        element: <ProjectOverviewPage/>
    },
    {
        isPrivate: true,
        path: "/tenant/:tenantId/project/progression/*",
        element: <TaskProgressionPage/>
    },
    {
        isPrivate: true,
        path: "/tenant/:tenantId/task/:taskId",
        element: <TaskViewerPage/>
    },
    {
        isPrivate: true,
        path: "/admin/users",
        element: <AdminUsersPage/>
    },
    {
        isPrivate: true,
        path: "/admin/user/details/:userId",
        element: <AdminUserDetailsPage/>
    },
    {
        isPrivate: true,
        path: "/admin/user/new",
        element: <AdminUserCreatePage/>
    },
    {
        isPrivate: true,
        path: "/admin/tenants",
        element: <AdminTenantsPage/>
    },
    {
        isPrivate: true,
        path: "/admin/entitlements/:tenantId/new",
        element: <AdminEntitlementCreatePage/>
    },
    {
        isPrivate: true,
        path: "/admin/entitlements/:tenantId/details/:entitlementType",
        element: <AdminEntitlementDetailsPage/>
    },
    {
        isPrivate: true,
        path: "/admin/entitlements/:tenantId",
        element: <AdminEntitlementsPage/>
    },
]