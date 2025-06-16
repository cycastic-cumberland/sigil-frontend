import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Plus} from "lucide-react";

const SmtpCredentialsPage = () => {
    return <MainLayout>
        <div className={"w-full p-5 flex flex-col"}>
            <div className={"mb-5"}>
                <Label className={"text-2xl text-secondary font-bold"}>
                    SMTP credentials
                </Label>
                <p className={"text-muted-foreground text-sm"}>
                    We will use these credentials to send templated emails.
                </p>
            </div>
            <div>
                <Button className={"text-secondary border-dashed border-2 border-secondary cursor-pointer " +
                    "hover:border-solid hover:text-primary hover:bg-secondary"}>
                    <Plus/>
                    <span>Create credential</span>
                </Button>
            </div>
        </div>
    </MainLayout>
}

export default SmtpCredentialsPage;