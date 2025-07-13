import {type ChangeEvent, type FC, type SyntheticEvent, useState} from "react";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from "@/components/ui/drawer.tsx";
import {toast} from "sonner";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";


const DecryptionDialog: FC<{ isLoading: boolean, onSave: (password: string) => void }> = ({ isLoading, onSave }) => {
    const {localLogout} = useAuthorization()
    const [password, setPassword] = useState("")

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        onSave(password)
    };

    const handleChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { value } = e.target;
        setPassword(value)
    };

    return <div className={"w-full"}>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-2">
                <div className="flex flex-row gap-2">
                    <Label className="w-32">Password:</Label>
                    <Input
                        className="flex-1 border-foreground"
                        value={password}
                        onChange={handleChange}
                        type={"password"}
                        required
                        disabled={isLoading}
                    />
                </div>
                <Button disabled={isLoading} type={"submit"} className={'flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                    { isLoading && <Spinner/> }
                    Unlock
                </Button>
                <Button disabled={isLoading} type={"button"} onClick={localLogout} className={'flex flex-grow border-destructive bg-destructive text-background border-2 cursor-pointer hover:bg-background hover:text-destructive'}>
                    Log out
                </Button>
            </div>
        </form>
    </div>
}


const DecryptPrivateKeyForm: FC<{
    openDialog: boolean,
    onComplete?: () => void,
    onReject?: () => void,
}> = ({ openDialog, onComplete, onReject }) => {
    const [isLoading, setIsLoading] = useState(false)
    const {decryptPrivateKey} = useAuthorization()
    const isDesktop = useMediaQuery("(min-width: 768px)")

    const onSubmit = async (password: string) => {
        try {
            setIsLoading(true)

            await decryptPrivateKey(password)
            if (onComplete){
                onComplete()
            }
        } catch (e: unknown) {
            if (e instanceof Error){
                toast.error(e.message)
            } else {
                toast.error("Failed to unlock user's session")
            }
        } finally {
            setIsLoading(false)
        }
    };

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
                    <DialogTitle>Enter your password</DialogTitle>
                    <DialogDescription>Enter your password to unlock this feature</DialogDescription>
                </DialogHeader>
                <DecryptionDialog isLoading={isLoading} onSave={onSubmit}/>
            </DialogContent>
        </Dialog> : <Drawer open={openDialog} onOpenChange={onReject}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Enter your password</DrawerTitle>
                    <DrawerDescription>Enter your password to unlock this feature</DrawerDescription>
                </DrawerHeader>
                <div className={"p-5"}>
                    <DecryptionDialog isLoading={isLoading} onSave={onSubmit}/>
                </div>
            </DrawerContent>
        </Drawer>
}

export default DecryptPrivateKeyForm