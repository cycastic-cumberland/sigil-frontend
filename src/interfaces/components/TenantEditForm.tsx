import {type ChangeEvent, type FC, type SyntheticEvent, useEffect, useState} from "react";
import type {TenantDto} from "@/dto/TenantDto.ts";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";

const emptyProject = (): TenantDto => {
    return {
        tenantName: "",
        membership: "MEMBER",
        permissions: ["MEMBER"]
    }
}

const TenantEditForm: FC<{
    submissionText?: string,
    error?: string,
    isLoading: boolean,
    tenant?: TenantDto,
    onSave: (project: TenantDto) => void,
    disableSave?: boolean,
}> = ({ submissionText, error, isLoading, tenant, onSave, disableSave }) => {
    const [formValues, setFormValues] = useState(tenant ? tenant : emptyProject())

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
        onSave({ ...formValues });
    };

    return <form onSubmit={handleSubmit}>
        <div className="grid gap-2">
            <Input
                className={"hidden"}
                value={formValues.id}
                onChange={handleChange}
                type={"number"}
                id="id"
                disabled={isLoading}
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
            { !disableSave && <Button disabled={isLoading} type={"submit"} className={`flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background ${error ? 'bg-destructive' : ''}`}>
                { error ? error : submissionText ? submissionText : 'Create' }
            </Button> }
        </div>
    </form>
}

export default TenantEditForm