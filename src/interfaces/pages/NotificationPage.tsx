import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import NotificationList from "@/interfaces/components/NotificationList.tsx";

const NotificationPage = () => {
    return <MainLayout>
        <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-foreground font-bold"}>
                    Notifications
                </Label>
            </div>
            <NotificationList className={'w-full mt-5'}/>
        </div>
    </MainLayout>
}

export default NotificationPage