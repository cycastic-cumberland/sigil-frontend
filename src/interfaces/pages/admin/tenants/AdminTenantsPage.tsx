import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {Label} from "@/components/ui/label.tsx";
import {useState} from "react";
import {useNavigate} from "react-router";
import {getAdminTenantListingLink} from "@/utils/path.ts";
import TenantTable from "@/interfaces/components/TenantTable.tsx";

const AdminTenantsPage = () => {
    const [isLoading, setIsLoading] = useState(true)
    const navigate = useNavigate()

    return <MainLayout>
        <div className={"w-full gap-3 p-5 flex flex-col"}>
            <div>
                <Label className={"text-2xl text-foreground font-bold"}>
                    Tenant list
                </Label>
            </div>
            <TenantTable isLoading={isLoading}
                         setIsLoading={setIsLoading}
                         userId={null}
                         getRowLink={getAdminTenantListingLink}
                         onSelect={t => navigate(getAdminTenantListingLink(t))}/>
        </div>
    </MainLayout>
}

export default AdminTenantsPage