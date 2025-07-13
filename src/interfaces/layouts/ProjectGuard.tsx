import type {FC, ReactNode} from "react";
import {useTenant} from "@/contexts/TenantContext.tsx";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";

const ProjectGuard: FC<{ children?: ReactNode | ReactNode[] }> = ({ children }) => {
    const {tenantId} = useTenant()

    return <>
        { tenantId ? children : <FullSizeSpinner/> }
    </>
}

export default ProjectGuard;