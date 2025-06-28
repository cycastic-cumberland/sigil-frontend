import {type ChangeEvent, type FC, type SyntheticEvent, useEffect, useState} from "react";
import type {DecryptedSmtpCredentialDto} from "@/dto/SmtpCredentialDto.ts";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ChevronDown, Eye, EyeOff} from "lucide-react";
import {Spinner} from "@/components/ui/shadcn-io/spinner";

type SecuritySettings = "starttls" | "none"
const possibleSecuritySettings: SecuritySettings[] = ["starttls", "none"]

const emptyCredential = (): DecryptedSmtpCredentialDto => {
    return {
        id: undefined as number | undefined,
        serverAddress: '',
        secureSmtp: 'starttls',
        port: 587,
        timeout: 15000,
        fromName: '',
        fromAddress: '',
        password: '',
    }
}

const SmtpCredentialEditForm: FC<{ submissionText?: string, error?: string, isLoading: boolean, credential?: DecryptedSmtpCredentialDto, onSave: (credential: DecryptedSmtpCredentialDto) => void }> = ({ submissionText, error, isLoading, credential, onSave }) => {
    const [formValues, setFormValues] = useState(
        credential ? credential : emptyCredential()
    )
    const [show, setShow] = useState(false)

    useEffect(() => {
        if (credential) {
            setFormValues({ ...credential });
        } else {
            setFormValues(emptyCredential());
        }
    }, [credential]);

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

    const handleSecuritySelect = (setting: SecuritySettings) => {
        setFormValues(prev => {
            const newValues = {...prev}
            newValues.secureSmtp = setting;
            return newValues
        });
    };

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        onSave({ ...formValues });
    };

    return  <form onSubmit={handleSubmit}>
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
                <Label className="w-32">Server address:</Label>
                <Input
                    className="flex-1 border-foreground"
                    value={formValues.serverAddress}
                    onChange={handleChange}
                    id="serverAddress"
                    required
                    disabled={isLoading}
                />
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-32">Security:</Label>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className={`flex flex-grow border-foreground border-1 cursor-pointer bg-foreground text-background ${formValues.secureSmtp === 'none' ? 'border-destructive bg-destructive hover:bg-background hover:text-destructive' : 'hover:bg-background hover:text-foreground'}`}
                                disabled={isLoading}>
                            { formValues.secureSmtp }
                            <ChevronDown/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                        { possibleSecuritySettings.map((setting, i) =>
                            <DropdownMenuItem key={i}
                                              className={'cursor-pointer'}
                                              onSelect={() => handleSecuritySelect(setting)}>
                                { setting }
                            </DropdownMenuItem>) }
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-32">Port:</Label>
                <Input
                    className="flex-1 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none border-foreground"
                    value={formValues.port}
                    onChange={handleChange}
                    type={"number"}
                    id="port"
                    required
                    disabled={isLoading}
                />
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-32">Timeout (ms):</Label>
                <Input
                    className="flex-1 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none border-foreground"
                    value={formValues.timeout}
                    onChange={handleChange}
                    type={"number"}
                    id="timeout"
                    required
                    disabled={isLoading}
                />
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-32">Sender name:</Label>
                <Input
                    className="flex-1 border-foreground"
                    value={formValues.fromName}
                    onChange={handleChange}
                    id="fromName"
                    required
                    disabled={isLoading}
                />
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-32">Email address:</Label>
                <Input
                    className="flex-1 border-foreground"
                    value={formValues.fromAddress}
                    onChange={handleChange}
                    id="fromAddress"
                    required
                    disabled={isLoading}
                />
            </div>
            <div className="flex flex-row gap-2">
                <Label className="w-32">Password:</Label>
                <div className="relative flex-1 items-center flex-grow">
                    <Input
                        className="border-foreground pr-10"
                        value={formValues.password}
                        onChange={handleChange}
                        id="password"
                        type={show ? "text" : "password"}
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        onClick={() => setShow((prev) => !prev)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
                        tabIndex={-1}
                    >
                        {show ? <EyeOff className="h-5 w-5 text-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                    </button>
                </div>
            </div>
            <Button disabled={isLoading} type={"submit"} className={`flex flex-grow border-foreground border-2 cursor-pointer hover:bg-foreground hover:text-background ${error ? 'bg-destructive' : ''}`}>
                { isLoading && <Spinner/> }
                { error ? error : submissionText ? submissionText : 'Create' }
            </Button>
        </div>
    </form>
}

export default SmtpCredentialEditForm