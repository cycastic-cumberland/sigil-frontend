import type {KanbanBoardEditFormDto} from "@/dto/pm/KanbanBoardDto.ts";
import type {Callback} from "@/utils/misc.ts";
import {type ChangeEvent, type SyntheticEvent, useEffect, useState} from "react";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Label} from "@/components/ui/label.tsx";

interface KanbanBoardEditFormProps<T extends KanbanBoardEditFormDto>{
    isLoading: boolean,
    board?: T,
    onSave: Callback<T>,
    submissionText?: string,
}

function getDefault<T extends KanbanBoardEditFormDto>(){
    return {
        boardName: ''
    } as T
}

export default function KanbanBoardEditForm<T extends KanbanBoardEditFormDto = KanbanBoardEditFormDto>(props: KanbanBoardEditFormProps<T>){
    const {isLoading, board, onSave, submissionText} = props
    const [formValues, setFormValues] = useState(board ? {...board} : getDefault<T>())

    useEffect(() => {
        setFormValues(board ? {...board} : getDefault<T>())
    }, [board]);

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
                value={(formValues as Record<string, undefined | number | string>).id}
                type={"number"}
                id="id"
                disabled={isLoading}
                readOnly
            />
            <div className="flex flex-row gap-2">
                <Label className="w-32">Board name:</Label>
                <Input
                    className="flex-1 border-foreground"
                    value={formValues.boardName}
                    onChange={handleChange}
                    id="boardName"
                    required
                    disabled={isLoading}
                />
            </div>
            <Button disabled={isLoading} type={"submit"} className={'flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                { submissionText ? submissionText : 'Create' }
            </Button>
        </div>
    </form>
}
