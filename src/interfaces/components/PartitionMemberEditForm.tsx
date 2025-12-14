import {type FC, type SyntheticEvent, useEffect, useMemo, useState} from "react";
import type {PartitionUserDto} from "@/dto/tenant/PartitionUserDto.ts";
import {Label} from "@/components/ui/label.tsx";
import {
    ALL_PARTITION_PERMISSIONS,
    getHumanReadablePartitionPermission,
    joinPartitionPermissions,
    type PartitionPermission
} from "@/dto/Permissions.ts";
import {Button} from "@/components/ui/button.tsx";
import {useTenant} from "@/contexts/TenantContext.tsx";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {Command, CommandGroup, CommandItem} from "@/components/ui/command.tsx";
import {Check, ChevronsUpDown} from "lucide-react";
import {cn} from "@/lib/utils.ts";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import type {TenantUserDto} from "@/dto/tenant/TenantUserDto.ts";
import MemberDebouncedSearchField from "@/interfaces/components/MemberDebouncedSearchField.tsx";

const emptyPartitionUserDto = (): PartitionUserDto => {
    return  {
        email: '',
        firstName: '',
        lastName: '',
        avatarToken: '',
        permissions: ["READ"],
    }
}

const PartitionMemberEditForm: FC<{
    disabled: boolean,
    isLoading?: boolean,
    partitionMember?: PartitionUserDto,
    onSave: (project: PartitionUserDto) => void
}> = ({ disabled, isLoading, partitionMember, onSave }) => {
    const [formValues, setFormValues] = useState(partitionMember ? { ...partitionMember } : emptyPartitionUserDto())
    const [permissionsPopoverOpened, setPermissionsPopoverOpened] = useState(false)
    const [isCreate, setIsCreate] = useState(!partitionMember)
    const {activeTenant, queryTenantMembers} = useTenant()
    const canListTenantMembers = useMemo(() => isCreate &&
            !!activeTenant &&
            (activeTenant.membership === "OWNER" ||
                activeTenant.permissions.includes("LIST_USERS")),
        [activeTenant, isCreate])

    useEffect(() => {
        setFormValues(partitionMember ? { ...partitionMember } : emptyPartitionUserDto())
        setIsCreate(!partitionMember)
    }, [partitionMember]);

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        onSave({ ...formValues });
    };

    const togglePermissions = (p: PartitionPermission) => {
        setFormValues((prev) => ({
             ...prev,
            permissions: prev.permissions.includes(p)
                ? prev.permissions.filter((perm) => perm !== p)
                : [...prev.permissions, p],
        }))
    }

    const setMember = (member: string | TenantUserDto | null) => setFormValues(f => ({
        ...f,
        email: !member ? '' : typeof member === 'string' ? member : member.email
    }))

    const searchMembers = async (contentTerms: string) => {
        const data = await queryTenantMembers(contentTerms, 1, 10, 'lastName')
        return data.items
    }

    return <form onSubmit={handleSubmit}>
        <div className="grid gap-2">
            <div className="flex flex-row gap-2">
                <Label className="w-32">Email:</Label>
                <MemberDebouncedSearchField id={'email'}
                                            onSearch={(canListTenantMembers && isCreate) ? searchMembers : undefined}
                                            value={formValues.email}
                                            onChange={setMember}
                                            disabled={disabled || !isCreate}
                                            required/>
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-32">Permissions:</Label>
                <Popover open={permissionsPopoverOpened} onOpenChange={setPermissionsPopoverOpened}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            disabled={disabled}
                            aria-expanded={permissionsPopoverOpened}
                            className="flex-1 justify-between"
                        >
                            {formValues.permissions.length >= 3 ? `${formValues.permissions.length} selected` : joinPartitionPermissions(formValues.permissions)}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandGroup>
                                {ALL_PARTITION_PERMISSIONS.map((value, i) => (
                                    <CommandItem
                                        key={i}
                                        className={"cursor-pointer"}
                                        disabled={value === "READ"}
                                        onSelect={() => {
                                            togglePermissions(value)
                                        }}
                                    >
                                        {getHumanReadablePartitionPermission(value)}
                                        <Check
                                            className={cn(
                                                "ml-auto",
                                                formValues.permissions.includes(value) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            <Button disabled={disabled} type={"submit"} className={'flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                { isLoading && <Spinner/> }
                { isCreate ? "Add" : "Save" }
            </Button>
        </div>
    </form>
}

export default PartitionMemberEditForm
