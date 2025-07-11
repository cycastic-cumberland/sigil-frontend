import type {UploadPartitionDto} from "@/dto/PartitionDto.ts";
import {type ChangeEvent, type FC, type SyntheticEvent, useEffect, useState} from "react";
import {Input} from "@/components/ui/input.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {Button} from "@/components/ui/button.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";

const emptyPartition = (): UploadPartitionDto => {
    return {
        partitionPath: '',
        serverSideKeyDerivation: false,
    }
}

const PartitionEditForm: FC<{
    submissionText?: string,
    isLoading: boolean,
    partition?: UploadPartitionDto,
    onSave: (p: UploadPartitionDto) => void,
}> = ({ submissionText, isLoading, partition, onSave }) => {
    const [formValues, setFormValues] = useState(
        partition ? partition : emptyPartition()
    )

    useEffect(() => {
        if (partition) {
            setFormValues({ ...partition });
        } else {
            setFormValues(emptyPartition());
        }
    }, [partition]);

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
            <div className="flex flex-row gap-2">
                <Label className="w-32">Enable SAE:</Label>
                <div>
                    <Tooltip>
                        <TooltipTrigger>
                            <Input
                                className="flex-1 border-foreground"
                                checked={formValues.serverSideKeyDerivation}
                                type={"checkbox"}
                                onChange={handleChange}
                                id="serverSideKeyDerivation"
                                disabled={isLoading}
                            />
                        </TooltipTrigger>
                        <TooltipContent>
                            Enable Server-Assisted Encryption (SAE) to enhance partition security by splitting key custody between users and Sigil.
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
            <Button disabled={isLoading} type={"submit"} className={'flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                { isLoading && <Spinner/> }
                { submissionText ? submissionText : 'Create' }
            </Button>
        </div>
    </form>
}

export default PartitionEditForm