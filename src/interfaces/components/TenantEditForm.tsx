import {type ChangeEvent, type FC, type SyntheticEvent, useEffect, useState} from "react";
import type {TenantDto, UsageType} from "@/dto/tenant/TenantDto.ts";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {getUserRole} from "@/utils/auth.ts";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {ChevronDown} from "lucide-react";
import {cn} from "@/lib/utils.ts";

const emptyProject = (): TenantDto => {
    return {
        tenantName: "",
        membership: "MEMBER",
        usageType: "STANDARD",
        permissions: ["MEMBER"],
    }
}

const UsageTypeLookup: Record<UsageType, string> = {
    UNRESTRICTED: "Unrestricted",
    STANDARD: "Standard"
}

const TenantEditForm: FC<{
    submissionText?: string,
    isLoading: boolean,
    tenant?: TenantDto,
    onSave: (project: TenantDto) => void,
    disableSave?: boolean,
}> = ({ submissionText, isLoading, tenant, onSave, disableSave }) => {
    const [formValues, setFormValues] = useState(tenant ? tenant : emptyProject())
    const canEditUsageType = getUserRole()?.includes("ADMIN") ?? false

    useEffect(() => {
        if (tenant) {
            setFormValues({ ...tenant });
        } else {
            setFormValues(emptyProject());
        }
    }, [tenant]);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { id, value, type, checked } = e.target;
        setFormValues((prev) => ({
            ...prev,
            [id]:
                type === 'checkbox'
                    ? checked
                    : value,
        }));
    };

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        const form = { ...formValues }
        if (!canEditUsageType){
            delete form.usageType
        }
        onSave(form);
    };

    const handleUsageTypeSelection = (u: UsageType) => {
        setFormValues(form => ({
            ...form,
            usageType: u
        }))
    }

    return <form onSubmit={handleSubmit}>
        <div className="grid gap-2">
            <Input
                className={"hidden"}
                value={formValues.id}
                type={"number"}
                id="id"
                disabled={isLoading}
                readOnly
            />
            <div className="flex flex-row gap-2">
                <Label className="w-32">Tenant name:</Label>
                <Input
                    className="flex-1 border-foreground"
                    value={formValues.tenantName}
                    onChange={handleChange}
                    id="tenantName"
                    required
                    disabled={isLoading}
                />
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-32">Usage type:</Label>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className={'flex flex-grow border-foreground border-1 cursor-pointer hover:bg-foreground hover:text-background justify-between'}
                                disabled={isLoading || !canEditUsageType}>
                            { formValues.usageType && UsageTypeLookup[formValues.usageType] }
                            <ChevronDown className={cn(canEditUsageType ? '' : 'invisible')}/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                        { Object.keys(UsageTypeLookup).map((usageType, i) =>
                            <DropdownMenuItem key={i}
                                              className={'cursor-pointer'}
                                              onSelect={() => handleUsageTypeSelection(usageType as UsageType)}>
                                { UsageTypeLookup[(usageType as UsageType)] }
                            </DropdownMenuItem>) }
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            { !formValues.createdAt ? <></> : <div className="flex flex-row gap-2">
                <Label className="w-32">Created at:</Label>
                <Input
                    className="flex-1 border-foreground"
                    value={new Date(formValues.createdAt).toString()}
                    id="createdAt"
                    disabled={true}
                />
            </div> }
            { !formValues.updatedAt ? <></> : <div className="flex flex-row gap-2">
                <Label className="w-32">Updated at:</Label>
                <Input
                    className="flex-1 border-foreground"
                    value={new Date(formValues.updatedAt).toString()}
                    id="updatedAt"
                    disabled={true}
                />
            </div> }
            { !disableSave && <Button disabled={isLoading} type={"submit"} className={'flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                { submissionText ? submissionText : 'Create' }
            </Button> }
        </div>
    </form>
}

export default TenantEditForm