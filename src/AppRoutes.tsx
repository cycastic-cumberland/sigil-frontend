import type {ReactNode} from "react";
import DashboardPage from "@/interfaces/pages/DashboardPage.tsx";
import LoginPage from "@/interfaces/pages/LoginPage.tsx";
import SmtpCredentialsPage from "@/interfaces/pages/emails/SmtpCredentialsPage.tsx";
import SmtpCredentialPage from "@/interfaces/pages/emails/SmtpCredentialPage.tsx";
import ListingsBrowser from "@/interfaces/pages/listings/ListingsBrowser.tsx";
import TemplateBrowserPage from "@/interfaces/pages/emails/TemplateBrowserPage.tsx";
import QueuePage from "@/interfaces/pages/emails/QueuePage.tsx";
import TelemetryPage from "@/interfaces/pages/emails/TelemetryPage.tsx";
import ProjectBrowserPage from "@/interfaces/pages/projects/ProjectBrowserPage.tsx";
import ProjectDetailsPage from "@/interfaces/pages/projects/ProjectDetailsPage.tsx";

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
        path: "/projects/browser",
        element: <ProjectBrowserPage/>
    },
    {
        isPrivate: true,
        path: "/projects/:id",
        element: <ProjectDetailsPage/>
    },
    {
        isPrivate: true,
        path: "/listings/browser/*",
        element: <ListingsBrowser/>
    },
    {
        isPrivate: true,
        path: "/emails/templates",
        element: <TemplateBrowserPage/>
    },
    {
        isPrivate: true,
        path: "/emails/queue",
        element: <QueuePage/>
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
    {
        isPrivate: true,
        path: "/emails/telemetry",
        element: <TelemetryPage/>
    },
]