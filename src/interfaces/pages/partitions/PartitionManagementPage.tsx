import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";

const PartitionManagementPage = () => {
    return <MainLayout>
        <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-foreground font-bold"}>
                    Manage partitions
                </Label>
            </div>
        </div>
    </MainLayout>
}

export default PartitionManagementPage
