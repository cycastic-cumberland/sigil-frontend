import type {UploadPartitionDto} from "@/dto/tenant/PartitionDto.ts";
import {type ChangeEvent, type ReactNode, type SyntheticEvent, useEffect, useState} from "react";
import {Input} from "@/components/ui/input.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {Button} from "@/components/ui/button.tsx";
import {Label} from "@/components/ui/label.tsx";
import type {Callback} from "@/utils/misc.ts";

export interface PartitionEditFormProps<T extends UploadPartitionDto> {
    submissionText?: string,
    isLoading: boolean,
    partition?: T,
    onSave: Callback<T>,
    defaultConstructor?: () => T,
    children?: ReactNode | ReactNode[]
}

const emptyPartition = <T extends UploadPartitionDto>(): T => {
    return {
        partitionPath: '',
        serverSideKeyDerivation: false,
    } as T
}

const PartitionEditForm = <T extends UploadPartitionDto>(
    {
        submissionText,
        isLoading,
        partition,
        onSave,
        defaultConstructor,
        children
    } : PartitionEditFormProps<T>) => {
    const [formValues, setFormValues] = useState(
        partition ? partition : defaultConstructor ? defaultConstructor() : emptyPartition<T>()
    )

    useEffect(() => {
        if (partition) {
            setFormValues({ ...partition });
        } else {
            setFormValues(defaultConstructor ? defaultConstructor() : emptyPartition<T>());
        }
    }, [defaultConstructor, partition]);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { id, value, type, checked } = e.target;
        setFormValues((prev) => ({
            ...prev,
            [id]:
                type === 'checkbox'
                    ? checked
                    : (id === 'port' || id === 'timeout')
                        ? Number(value)
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
                <Label className="w-32">Path:</Label>
                <Input
                    className="flex-1 border-foreground"
                    value={formValues.partitionPath}
                    onChange={handleChange}
                    id="partitionPath"
                    required
                    disabled={isLoading}
                />
            </div>
            {children}
            <Button disabled={isLoading} type={"submit"} className={'flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                { isLoading && <Spinner/> }
                { submissionText ? submissionText : 'Create' }
            </Button>
        </div>
    </form>
}

export default PartitionEditForm