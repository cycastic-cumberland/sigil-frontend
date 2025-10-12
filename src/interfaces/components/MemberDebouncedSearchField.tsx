import {
    type ChangeEvent,
    type Context,
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useState
} from "react";
import type {Callback} from "@/utils/misc.ts";
import {Input} from "@/components/ui/input.tsx";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ChevronsUpDown, X} from "lucide-react";
import {Command, CommandGroup, CommandInput, CommandItem} from "@/components/ui/command.tsx";
import type {MemberDto} from "@/dto/MemberDto.ts";
import {notifyApiError} from "@/utils/errors.ts";

export type TenantMemberDebouncedSearchFieldProps<T extends MemberDto> = {
    id?: string,
    onSearch?: (contentTerms: string) => Promise<T[]>
    required?: boolean,
    disabled?: boolean,
    debounce?: number,
    value?: string,
    onChange: Callback<string | T | null>,
    children?: ReactNode | ReactNode[],
}

export type SearchItemContextType<T extends MemberDto> = {
    item: T
}

const SearchItemContext = createContext({
    item: {
        email: '',
        firstName: '',
        lastName: ''
    }
} as SearchItemContextType<MemberDto>)

export function useSearchItem<T extends MemberDto>() {
    return useContext(SearchItemContext as never as Context<SearchItemContextType<T>>)
}

const isItem = (child: ReactNode) =>
(child as {type: unknown})?.type === MemberDebouncedSearchField.SearchItem

// WIP
// function SearchItemProvider<T extends MemberDto>({children, item}: SearchItemContextType<T> & {children: ReactNode}) {
//     return <SearchItemContext.Provider value={{item}}>
//         {children}
//     </SearchItemContext.Provider>
// }
//
// function SearchItemStub<T extends MemberDto>({children} : {children?: ReactNode}){
//     const {item} = useSearchItem<T>()
//     const matchingChild = useMemo(() => Array.isArray(children) ? children.find(isItem) as ReactNode : isItem(children) ? children : null, [children])
//
//     return <>
//         {matchingChild ?? item.email}
//     </>
// }

export default function MemberDebouncedSearchField<T extends MemberDto = MemberDto>({id, required, disabled, debounce, value, onChange, onSearch, children}: TenantMemberDebouncedSearchFieldProps<T>){
    const [emailPopoverOpened, setEmailPopoverOpened] = useState(false)
    const [, setSearching] = useState(false)
    const [displayValue, setDisplayValue] = useState('')
    const [query, setQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')
    const [searchResults, setSearchResult] = useState([] as T[])

    useEffect(() => {
        if (value !== undefined){
            setDisplayValue(value)
        }
    }, [value]);

    useEffect(() => {
        setSearching(true)
        const handler = setTimeout(() => {
            setDebouncedQuery(query.trim())
        }, !debounce || debounce < 100 ? 200 : debounce) // Default 200ms debounce

        return () => {
            clearTimeout(handler)
        }
    }, [query])

    useEffect(() => {
        if (!debouncedQuery || !onSearch){
            setSearchResult([])
            return
        }

        (async () => {
            try {
                setSearching(true)
                const data = await onSearch(debouncedQuery)
                setSearchResult(data)
            } catch (e){
                notifyApiError(e)
            } finally {
                setSearching(false)
            }
        })()
    }, [onSearch, debouncedQuery]);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { value } = e.target;
        if (onSearch){
            setQuery(value)
            onChange(value)
        } else {
            setDisplayValue(value)
        }
    }

    const handleBlur = () => {
        onChange(displayValue)
    }

    const handleSearch = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const { value } = e.target;
        setQuery(value)
    };

    return !onSearch
        ? <Input className="flex-1 border-foreground"
                 value={displayValue}
                 onChange={handleChange}
                 onBlur={handleBlur}
                 id={id}
                 required={required}
                 disabled={disabled}
        />
        : <>
            <Input
                className="hidden"
                value={displayValue}
                required={required}
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
                        {
                            // Trigger empty
                            (() => {
                                if (displayValue){
                                    return undefined
                                }
                                if (!children) {
                                    return "Search user..."
                                }

                                const isTriggerEmpty = (child: ReactNode) =>
                                    (child as {type: unknown})?.type === MemberDebouncedSearchField.TriggerEmpty

                                if (Array.isArray(children)) {
                                    const triggerChild = children.find(isTriggerEmpty)
                                    return triggerChild || "Search user..."
                                }

                                return isTriggerEmpty(children) ? children : "Search user..."
                            })()
                        }
                        {
                            // Trigger
                            (() => {
                                if (!displayValue){
                                    return undefined
                                }
                                if (!children) {
                                    return displayValue
                                }

                                const isTrigger = (child: ReactNode) =>
                                    (child as {type: unknown})?.type === MemberDebouncedSearchField.Trigger

                                if (Array.isArray(children)) {
                                    const triggerChild = children.find(isTrigger)
                                    return triggerChild || displayValue
                                }

                                return isTrigger(children) ? children : displayValue
                            })()
                        }
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0">
                    <Command>
                        <CommandInput placeholder="Search user..."
                                      name={"email"}
                                      value={query}
                                      onInput={handleSearch}/>
                        <CommandGroup key={query}>
                            <CommandItem className={"cursor-pointer truncate overflow-hidden whitespace-nowrap"}
                                         onSelect={() => {
                                             setDisplayValue('')
                                             onChange(null)
                                             setQuery('')
                                             setEmailPopoverOpened(false)
                                         }}>
                                <X/>
                                Deselect
                            </CommandItem>
                            {searchResults.map((item) => <div>
                                {(() => {
                                    return <CommandItem key={item.email} className={"cursor-pointer truncate overflow-hidden whitespace-nowrap"}
                                                        onSelect={() => {
                                                            setDisplayValue(item.email)
                                                            onChange(item)
                                                            setQuery('')
                                                            setEmailPopoverOpened(false)
                                                        }}
                                    >
                                        {
                                            (() => {
                                               const matchingChild = Array.isArray(children) ? children.find(isItem) as ReactNode : isItem(children) ? children : null
                                               return matchingChild ? matchingChild : item.email
                                            })()
                                        }
                                    </CommandItem>
                                })()}
                            </div>)}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
        </>
}

MemberDebouncedSearchField.TriggerEmpty = function({children}: {children?: ReactNode}) {
    return children
}

MemberDebouncedSearchField.Trigger = function({children}: {children?: ReactNode}) {
    return children
}

MemberDebouncedSearchField.SearchItem = function({children}: {children?: ReactNode}) {
    return children
}
