import {type FC, type ReactNode, useEffect, useState} from "react";
import {useNavigate} from "react-router";
import {getAuth} from "@/utils/auth.ts";

const PrivateRoute: FC<{ children: ReactNode }> = ({ children }) => {
    const [isReady, setIsReady] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        if (getAuth()){
            setIsReady(true)
            return
        }

        navigate("/login")
    }, [navigate]);

    return <>
        { isReady ? children : undefined }
    </>
}

export default PrivateRoute