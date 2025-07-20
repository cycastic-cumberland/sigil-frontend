import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import TenantTable from "@/interfaces/components/TenantTable.tsx";
import {useState} from "react";
import {useNavigate} from "react-router";
import type {TenantDto} from "@/dto/TenantDto.ts";

const getTenantLink = (t: TenantDto): string => {
    return `/tenant/${t.id}/partitions/browser/`
}

const DashboardPage = () => {
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()

    return <MainLayout>
        <div className={"w-full p-5 flex flex-col"}>
            <div className={"my-2"}>
                <Label className={"text-2xl text-foreground font-bold"}>
                    Select a tenant to continue
                </Label>
            </div>
            <div className={"my-3 w-full"}>
                <TenantTable isLoading={isLoading}
                             setIsLoading={setIsLoading}
                             getRowLink={getTenantLink}
                             onSelect={t => navigate(getTenantLink(t))}/>
            </div>
        </div>
    </MainLayout>
}

export default DashboardPage