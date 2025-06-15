import {AuthorizationProvider} from "@/contexts/AuthorizationContext.tsx";
import {BrowserRouter, Route, Routes} from "react-router";
import {AppRoutes} from "@/AppRoutes.tsx";
import PrivateRoute from "@/PrivateRoute.tsx";

const App = () =>  {
    return (
            <AuthorizationProvider>
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
            </AuthorizationProvider>
    )
}

export default App
