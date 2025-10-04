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
                    <DialogTitle>Your data is locked</DialogTitle>
                    <DialogDescription>Your sensitive data is automatically locked. Choose an option below to unlock it.</DialogDescription>
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
                    <DrawerTitle>Your data is locked</DrawerTitle>
                    <DrawerDescription>Your sensitive data is automatically locked. Choose an option below to unlock it.</DrawerDescription>
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