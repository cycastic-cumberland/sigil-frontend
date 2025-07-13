import {AuthorizationProvider} from "@/contexts/AuthorizationContext.tsx";
import {BrowserRouter, Route, Routes} from "react-router";
import {AppRoutes} from "@/AppRoutes.tsx";
import PrivateRoute from "@/PrivateRoute.tsx";
import {SidebarProvider} from "@/components/ui/sidebar.tsx";
import {ThemeProvider} from "@/contexts/ThemeContext.tsx";
import {Toaster} from "@/components/ui/sonner"
import {ServerCommunicationProvider} from "@/contexts/ServerCommunicationContext.tsx";
import type {FC, ReactNode} from "react";
import {TenantProvider} from "@/contexts/TenantContext.tsx";

const RouteDependentProviders: FC<{children: ReactNode | ReactNode[]}> = ({ children }) => {
    return <TenantProvider>
        { children }
    </TenantProvider>
}

const App = () =>  {
    return (
        <ServerCommunicationProvider>
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <Toaster/>
                <AuthorizationProvider>
                    <SidebarProvider>
                        <BrowserRouter>
                            <Routes>
                                { AppRoutes.map((route, index) => {
                                    const { element, isPrivate, ...rest } = route;
                                    return isPrivate
                                        ? <Route key={index} {...rest} element={<RouteDependentProviders><PrivateRoute>{ element }</PrivateRoute></RouteDependentProviders>} />
                                        : <Route key={index} {...rest} element={<RouteDependentProviders>{ element }</RouteDependentProviders>} />;
                                }) }
                            </Routes>
                        </BrowserRouter>
                    </SidebarProvider>
                </AuthorizationProvider>
            </ThemeProvider>
        </ServerCommunicationProvider>
    )
}

export default App
