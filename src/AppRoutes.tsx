import type {ReactNode} from "react";
import DashboardPage from "@/interfaces/pages/DashboardPage.tsx";
import LoginPage from "@/interfaces/pages/LoginPage.tsx";
import SmtpCredentialsPage from "@/interfaces/pages/emails/SmtpCredentialsPage.tsx";
import SmtpCredentialPage from "@/interfaces/pages/emails/SmtpCredentialPage.tsx";

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
        isPrivate: true,
        path: "/emails/credentials",
        element: <SmtpCredentialsPage/>
    },
    {
        isPrivate: true,
        path: "/emails/credential/:id",
        element: <SmtpCredentialPage/>
    },
]