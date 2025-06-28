import {AuthorizationProvider} from "@/contexts/AuthorizationContext.tsx";
import {BrowserRouter, Route, Routes} from "react-router";
import {AppRoutes} from "@/AppRoutes.tsx";
import PrivateRoute from "@/PrivateRoute.tsx";
import {SidebarProvider} from "@/components/ui/sidebar.tsx";
import {ProjectProvider} from "@/contexts/ProjectContext.tsx";
import {ThemeProvider} from "@/contexts/ThemeContext.tsx";
import {Toaster} from "@/components/ui/sonner"

const App = () =>  {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <Toaster/>
            <AuthorizationProvider>
                <SidebarProvider>
                    <ProjectProvider>
                        <BrowserRouter>
                            <Routes>
                                { AppRoutes.map((route, index) => {
                                    const { element, isPrivate, ...rest } = route;
                                    return isPrivate
                                        ? <Route key={index} {...rest} element={<PrivateRoute>{ element }</PrivateRoute>} />
                                        : <Route key={index} {...rest} element={element} />;
                                }) }
                            </Routes>
                        </BrowserRouter>
                    </ProjectProvider>
                </SidebarProvider>
            </AuthorizationProvider>
        </ThemeProvider>
    )
}

export default App
