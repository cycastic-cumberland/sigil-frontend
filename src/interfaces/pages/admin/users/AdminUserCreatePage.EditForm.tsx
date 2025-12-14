import {type ChangeEvent, type FC} from "react";
import type {UserRole, UserStatus} from "@/dto/user/UserInfoDto.ts";
import type {Callback} from "@/utils/misc.ts";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Check, ChevronDown} from "lucide-react";
import {cn} from "@/lib/utils.ts";

export type AdminUserCreatePageEditFormType = {
    id?: number,
    firstName: string,
    lastName: string,
    email: string,
    emailVerified: boolean,
    status: UserStatus,
    roles: UserRole[],
}

export const defaultFormValues = (): AdminUserCreatePageEditFormType => {
    return  {
        firstName: '',
        lastName: '',
        email: '',
        emailVerified: true,
        status: 'ACTIVE',
        roles: ['COMMON'],
    }
}

const UserStatusLookup: Record<UserStatus, string> = {
    INVITED: 'Invited',
    ACTIVE: 'Active',
    DISABLED: 'Disabled'
}

export const AdminUserCreatePageEditForm: FC<{
    values: AdminUserCreatePageEditFormType
    setValues: Callback<Callback<AdminUserCreatePageEditFormType, AdminUserCreatePageEditFormType>>,
    isLoading: boolean
}> = ({values, setValues, isLoading}) => {

    const handleChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { id, value, type, checked } = e.target;
        setValues((prev) => ({
            ...prev,
            [id]:
                type === 'checkbox'
                    ? checked
                    : value,
        }));
    }

    const handleUsageTypeSelection = (status: UserStatus) => {
        setValues(form => ({
            ...form,
            status
        }))
    }

    const handleRolesSelection = (roles: UserRole[]) => {
        setValues(form => ({
            ...form,
            roles
        }))
    }

    return <>
        <Input
            className={"hidden"}
            value={values.id}
            type={"number"}
            id={"id"}
            disabled={isLoading}
            readOnly
        />
        <div className="flex flex-row gap-2">
            <Label className="w-32">First name:</Label>
            <Input
                className={"flex-1 border-foreground"}
                value={values.firstName}
                onChange={handleChange}
                id={"firstName"}
                required
                disabled={isLoading}
            />
        </div>
        <div className="flex flex-row gap-2">
            <Label className="w-32">Last name:</Label>
            <Input
                className={"flex-1 border-foreground"}
                value={values.lastName}
                onChange={handleChange}
                id={"lastName"}
                required
                disabled={isLoading}
            />
        </div>
        <div className="flex flex-row gap-2">
            <Label className="w-32">Email:</Label>
            <Input
                className={"flex-1 border-foreground"}
                value={values.email}
                onChange={handleChange}
                id={"email"}
                required
                disabled={isLoading}
            />
        </div>
        <div className="flex flex-row gap-2">
            <Label className="w-32">Email verified:</Label>
            <Input
                className={"flex-1 border-foreground"}
                checked={values.emailVerified}
                onChange={handleChange}
                id={"emailVerified"}
                disabled={values.emailVerified}
                type={'checkbox'}
            />
        </div>
        <div className="flex flex-row gap-2">
            <Label className="w-32">Status:</Label>
            <Input
                className={"hidden"}
                value={values.status}
                id={"status"}
                disabled={isLoading}
                readOnly
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button className={'flex flex-grow border-foreground border-1 cursor-pointer hover:bg-foreground hover:text-background justify-between'}
                            disabled={isLoading}>
                        { values.status && UserStatusLookup[values.status] }
                        <ChevronDown/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                    { Object.keys(UserStatusLookup).map((statusType, i) =>
                        <DropdownMenuItem key={i}
                                          className={'cursor-pointer'}
                                          onSelect={() => handleUsageTypeSelection(statusType as UserStatus)}>
                            { UserStatusLookup[(statusType as UserStatus)] }
                            <Check className={cn(values.status === statusType ? '' : 'hidden')}/>
                        </DropdownMenuItem>) }
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <div className="flex flex-row gap-2">
            <Label className="w-32">Roles:</Label>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button className={'flex flex-grow border-foreground border-1 cursor-pointer hover:bg-foreground hover:text-background justify-between'}
                            disabled={isLoading}>
                        { values.roles.length } selected
                        <ChevronDown/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className={'w-48'}>
                    <DropdownMenuItem className={'cursor-pointer'} disabled>
                        Common
                        <Check/>
                    </DropdownMenuItem>
                    <DropdownMenuItem className={'cursor-pointer'} onClick={() => handleRolesSelection(values.roles.includes('ADMIN') ? ['COMMON'] : ['COMMON', 'ADMIN'])}>
                        Administrator
                        <Check className={cn(values.roles.includes('ADMIN') ? '' : 'hidden')}/>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </>
}