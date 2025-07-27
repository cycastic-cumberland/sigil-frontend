import {type ChangeEvent, type FC, type SyntheticEvent, useEffect, useMemo, useState} from "react";
import type {PartitionUserDto} from "@/dto/PartitionUserDto.ts";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {
    getHumanReadablePartitionPermission,
    joinPartitionPermissions,
    type PartitionPermission
} from "@/dto/Permissions.ts";
import {Button} from "@/components/ui/button.tsx";
import {useTenant} from "@/contexts/TenantContext.tsx";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem} from "@/components/ui/command.tsx";
import {Check, ChevronsUpDown} from "lucide-react";
import api from "@/api.ts";
import type {PageDto} from "@/dto/PageDto.ts";
import {cn} from "@/lib/utils.ts";
import {Spinner} from "@/components/ui/shadcn-io/spinner";

const emptyPartitionUserDto = (): PartitionUserDto => {
    return  {
        email: '',
        firstName: '',
        lastName: '',
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
    const [emailPopoverOpened, setEmailPopoverOpened] = useState(false)
    const [permissionsPopoverOpened, setPermissionsPopoverOpened] = useState(false)
    const [searching, setSearching] = useState(false)
    const [isCreate, setIsCreate] = useState(!partitionMember)
    const {activeTenant} = useTenant()
    const canListTenantMembers = useMemo(() => isCreate &&
            !!activeTenant &&
            (activeTenant.membership === "OWNER" ||
                activeTenant.permissions.includes("LIST_USERS")),
        [activeTenant, isCreate])
    const [query, setQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')
    const [searchResults, setSearchResult] = useState([] as string[])

    useEffect(() => {
        setFormValues(partitionMember ? { ...partitionMember } : emptyPartitionUserDto())
        setIsCreate(!partitionMember)
    }, [partitionMember]);

    useEffect(() => {
        setSearching(true)
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300); // 300ms debounce

        return () => {
            clearTimeout(handler);
        };
    }, [query]);

    useEffect(() => {
        if (!debouncedQuery || !canListTenantMembers){
            setSearchResult([])
            return
        }

        (async () => {
            try {
                setSearching(true)
                const response = await api.get(`tenants/members/prefix?emailPrefix=${encodeURIComponent(debouncedQuery)}&page=1&pageSize=20`)
                const data = response.data as PageDto<string>
                setSearchResult(data.items)
            } finally {
                setSearching(false)
            }
        })()
    }, [canListTenantMembers, debouncedQuery]);


    const handleChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { id, name, value, type, checked } = e.target;
        if (name === 'email' && canListTenantMembers){
            setQuery(value)
        }
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

    const togglePermissions = (p: PartitionPermission) => {
        setFormValues((prev) => ({
             ...prev,
            permissions: prev.permissions.includes(p)
                ? prev.permissions.filter((perm) => perm !== p)
                : [...prev.permissions, p],
        }))
    }

    return <form onSubmit={handleSubmit}>
        <div className="grid gap-2">
            <div className="flex flex-row gap-2">
                <Label className="w-32">Email:</Label>
                { !canListTenantMembers || !isCreate ? <Input
                    className="flex-1 border-foreground"
                    value={formValues.email}
                    onChange={handleChange}
                    id="email"
                    required
                    disabled={disabled || !isCreate}
                /> : <>
                    <Input
                        className="hidden"
                        value={formValues.email}
                        required
                        disabled={disabled}
                    />
                    <Popover open={emailPopoverOpened} onOpenChange={setEmailPopoverOpened}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={emailPopoverOpened}
                                className="flex-1 justify-between"
                            >
                                {formValues.email
                                    ? formValues.email
                                    : "Search email..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder="Search email..."
                                              name={"email"}
                                              value={query}
                                              onInput={handleChange}/>
                                <CommandEmpty>
                                    { searching ? "Searching..." : query ? "No user found" : "Start typing to search" }
                                </CommandEmpty>
                                <CommandGroup>
                                    {searchResults.map((value) => (
                                        <CommandItem
                                            key={value}
                                            className={"cursor-pointer"}
                                            onSelect={(currentValue) => {
                                                setFormValues((prev) => ({
                                                    ...prev,
                                                    email: currentValue
                                                }))
                                                setQuery('')
                                                setEmailPopoverOpened(false)
                                            }}
                                        >
                                            {value}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </> }
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
                            {joinPartitionPermissions(formValues.permissions)}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandGroup>
                                {(["READ", "WRITE", "MODERATE"] as PartitionPermission[]).map((value, i) => (
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
                { isCreate ? "Create" : "Save" }
            </Button>
        </div>
    </form>
}

export default PartitionMemberEditForm
