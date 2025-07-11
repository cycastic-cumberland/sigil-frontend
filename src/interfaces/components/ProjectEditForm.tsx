import {type ChangeEvent, type FC, type SyntheticEvent, useEffect, useState} from "react";
import type {TenantDto} from "@/dto/TenantDto.ts";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";

const emptyProject = (): TenantDto => {
    return {
        tenantName: "",
        corsSettings: "",
    }
}

const ProjectEditForm: FC<{
    submissionText?: string,
    error?: string,
    isLoading: boolean,
    project?: TenantDto,
    onSave: (project: TenantDto) => void
}> = ({ submissionText, error, isLoading, project, onSave }) => {
    const [formValues, setFormValues] = useState(project ? project : emptyProject())

    useEffect(() => {
        if (project) {
            setFormValues({ ...project });
        } else {
            setFormValues(emptyProject());
        }
    }, [project]);

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
                <Label className="w-32">Project name:</Label>
                <Input
                    className="flex-1 border-foreground"
                    value={formValues.tenantName}
                    onChange={handleChange}
                    id="projectName"
                    required
                    disabled={isLoading}
                />
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-32">Allowed origins:</Label>
                <Input
                    className="flex-1 border-foreground"
                    value={formValues.corsSettings}
                    onChange={handleChange}
                    id="corsSettings"
                    disabled={isLoading}
                />
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-32 invisible"/>
                <p className={"text-muted-foreground text-sm flex-1"}>
                    Multiple origins are separated by semicolons.
                </p>
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
            <Button disabled={isLoading} type={"submit"} className={`flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background ${error ? 'bg-destructive' : ''}`}>
                { error ? error : submissionText ? submissionText : 'Create' }
            </Button>
        </div>
    </form>
}

export default ProjectEditForm