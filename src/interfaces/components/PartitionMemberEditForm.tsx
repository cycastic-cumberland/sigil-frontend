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

const emptyPartitionUserDto = (): PartitionUserDto => {
    return  {
        email: '',
        firstName: '',
        lastName: '',
        permissions: ["READ"],
    }
}

const PartitionMemberEditForm: FC<{
    isLoading: boolean,
    partitionMember?: PartitionUserDto,
    onSave: (project: PartitionUserDto) => void
}> = ({ isLoading, partitionMember, onSave }) => {
    const [formValues, setFormValues] = useState(partitionMember ? { ...partitionMember } : emptyPartitionUserDto())
    const [emailPopoverOpened, setEmailPopoverOpened] = useState(false)
    const [permissionsPopoverOpened, setPermissionsPopoverOpened] = useState(false)
    const [isCreate, setIsCreate] = useState(!partitionMember)
    const {activeProject} = useTenant()
    const canListTenantMembers = useMemo(() => isCreate &&
            !!activeProject &&
            (activeProject.membership === "OWNER" ||
                activeProject.permissions.includes("LIST_USERS")),
        [activeProject, isCreate])
    const [query, setQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')
    const [searchResults, setSearchResult] = useState([] as string[])

    useEffect(() => {
        setFormValues(partitionMember ? { ...partitionMember } : emptyPartitionUserDto())
        setIsCreate(!partitionMember)
    }, [partitionMember]);

    useEffect(() => {
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
            const response = await api.get(`tenants/members/prefix?emailPrefix=${encodeURIComponent(debouncedQuery)}&page=1&pageSize=20`)
            const data = response.data as PageDto<string>
            setSearchResult(data.items)
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
                { !canListTenantMembers ? <Input
                    className="flex-1 border-foreground"
                    value={formValues.email}
                    onChange={handleChange}
                    id="email"
                    required
                    disabled={isLoading}
                /> : <>
                    <Input
                        className="hidden"
                        value={formValues.email}
                        required
                        disabled={isLoading}
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
                                    { query ? "No user found" : "Start typing to search" }
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
            <Button disabled={isLoading} type={"submit"} className={'flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background'}>
                { isCreate ? "Create" : "Save" }
            </Button>
        </div>
    </form>
}

export default PartitionMemberEditForm
