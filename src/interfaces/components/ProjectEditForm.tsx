import type {UploadProjectDto} from "@/dto/tenant/UploadProjectDto.ts";
import PartitionEditForm, {type PartitionEditFormProps} from "@/interfaces/components/PartitionEditForm.tsx";
import type {Callback} from "@/utils/misc.ts";
import {useState} from "react";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";

const ProjectEditForm = <T extends UploadProjectDto>(props: PartitionEditFormProps<T>) => {
    const [id, setId] = useState('')

    const onSave: Callback<T> = (data) => {
        props.onSave({
            ...data,
            uniqueIdentifier: id.toUpperCase()
        })
    }

    return <PartitionEditForm {...props} onSave={onSave}>
        <div className="flex flex-row gap-2">
            <Label className="w-32">Project identifier:</Label>
            <Input
                className="flex-1 border-foreground"
                value={id}
                onChange={(e) => setId(e.target.value)}
                id="uniqueIdentifier"
                required
                disabled={props.isLoading}
            />
        </div>
        {props.children}
    </PartitionEditForm>
}

export default ProjectEditForm
