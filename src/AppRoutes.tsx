import type {ReactNode} from "react";
import DashboardPage from "@/interfaces/pages/DashboardPage.tsx";
import LoginPage from "@/interfaces/pages/LoginPage.tsx";

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
    }
]