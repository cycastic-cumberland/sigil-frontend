import type {FC} from "react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";

const ConfirmationDialog: FC<{
    confirmationOpened: boolean,
    setConfirmationOpened: (b: boolean) => void,
    onAccepted: () => void,
    title: string,
    message: string,
    acceptText: string,
    cancelText?: string,
    destructive?: boolean,
}> = ({ confirmationOpened, setConfirmationOpened, onAccepted, title, message, acceptText, cancelText, destructive }) => {
    return <Dialog open={confirmationOpened} onOpenChange={setConfirmationOpened}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>{ title }</DialogTitle>
                <DialogDescription>
                    { message }
                </DialogDescription>
            </DialogHeader>
            <div className={"w-full flex flex-row-reverse gap-2"}>
                <Button className={`cursor-pointer ${destructive ? 'bg-destructive': ''}`} onClick={onAccepted}>{ acceptText }</Button>
                <Button className={"cursor-pointer"} onClick={() => setConfirmationOpened(false)}>{ cancelText ?? "Cancel" }</Button>
            </div>
        </DialogContent>
    </Dialog>
}

export default ConfirmationDialog