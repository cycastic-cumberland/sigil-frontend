import {type FC, useState} from "react";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from "@/components/ui/drawer.tsx";
import {PrivateKeyDecryptor} from "@/interfaces/components/PrivateKeyDecryptor.tsx";

const PrivateKeyDecryptionDialog: FC<{
    openDialog: boolean,
    onComplete?: () => void,
    onReject?: () => void,
}> = ({ openDialog, onComplete, onReject }) => {
    const [isLoading, setIsLoading] = useState(false)
    const isDesktop = useMediaQuery("(min-width: 768px)")

    return isDesktop ? <Dialog open={openDialog} onOpenChange={o => {
        if (o) {
            return
        }

        if (onReject){
            onReject()
        }
    }} >
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Unlock your private key</DialogTitle>
                    <DialogDescription>Unlock your session with one of the method bellow.</DialogDescription>
                </DialogHeader>
                <PrivateKeyDecryptor isLoading={isLoading}
                                     setIsLoading={setIsLoading}
                                     onSuccess={onComplete}/>
            </DialogContent>
        </Dialog> : <Drawer open={openDialog} onOpenChange={o => {
        if (o) {
            return
        }

        if (onReject){
            onReject()
        }
    }}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Unlock your private key</DrawerTitle>
                    <DrawerDescription>Unlock your session with one of the method bellow.</DrawerDescription>
                </DrawerHeader>
                <div className={"p-5"}>
                    <PrivateKeyDecryptor isLoading={isLoading}
                                         setIsLoading={setIsLoading}
                                         onSuccess={onComplete}/>
                </div>
            </DrawerContent>
        </Drawer>
}

export default PrivateKeyDecryptionDialog