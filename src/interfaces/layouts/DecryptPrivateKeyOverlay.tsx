import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import {type FC, type ReactNode, useEffect, useState} from "react";
import {MAGIC_CONSTANT_SAVE_ENCRYPTION_KEY} from "@/utils/debug.ts";
import DecryptPrivateKeyDialog from "@/interfaces/components/DecryptPrivateKeyForm.tsx";
import {useNavigate} from "react-router";

const DecryptPrivateKeyOverlay: FC<{ children?: ReactNode | ReactNode[] }> = ({ children }) => {
    const [openDialog, setOpenDialog] = useState(true)
    const {decryptPrivateKey, userPrivateKey} = useAuthorization()
    const navigate = useNavigate()

    useEffect(() => {
        if (userPrivateKey){
            setOpenDialog(false)
            return
        }

        setOpenDialog(true)
        const debugKey = localStorage.getItem(MAGIC_CONSTANT_SAVE_ENCRYPTION_KEY)
        if (debugKey && location.protocol !== "https:"){
            decryptPrivateKey(password).then(() => setOpenDialog(false))
        }
    }, [userPrivateKey, openDialog]);

    return !openDialog ? children :<div className={"w-full min-h-screen bg-background"}>
        <DecryptPrivateKeyDialog openDialog={openDialog} onReject={() => navigate(-1)}/>
        { userPrivateKey && children }
    </div>
}

export default DecryptPrivateKeyOverlay