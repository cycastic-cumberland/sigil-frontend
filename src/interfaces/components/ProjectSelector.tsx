import {useMemo, useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog.tsx";
import type {ProjectDto} from "@/dto/ProjectDto.ts";
import {useProject} from "@/contexts/ProjectContext.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import type {PageDto} from "@/dto/PageDto.ts";
import {getAuth} from "@/utils/auth.ts";
import {type ColumnDef, flexRender, getCoreRowModel, useReactTable} from "@tanstack/react-table";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Label} from "@/components/ui/label.tsx";

const projectSelectorColumnDef: ColumnDef<ProjectDto>[] = [
    {
        accessorKey: 'projectName',
        header: 'Name'
    },
    {
        accessorKey: 'createdAt',
        header: 'Created at'
    }
]

const ChangeActiveProjectDialog = () => {
    // const [selectedProject, setSelectedProject] = useState(null as ProjectDto | null)
    const [page, setPage] = useState({ items: [], pageSize: 0, page: 1, totalPages: 0, totalElements: 0 } as PageDto<ProjectDto>)
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const {activeProject, changeActiveProject, queryProjects} = useProject()
    const tableData = useMemo(() => page.items, [page])
    const columns = useMemo(() => projectSelectorColumnDef, [])
    const table = useReactTable({
        data: tableData,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    const refreshActiveProjects = async () => {
        setIsLoading(true)
        try {
            const data = await queryProjects(getAuth()!.userId, 1, 5, null)
            setPage(data)
        } finally {
            setIsLoading(false)
        }
    }

    return <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            {/*<div className={"bg-primary"}>*/}
            {/*</div>*/}
            <button disabled={isLoading}
                    className={"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border shadow-xs h-9 px-4 py-2 has-[>svg]:px-3 cursor-pointer bg-secondary text-primary hover:bg-foreground hover:text-secondary"}
                    onClick={refreshActiveProjects}>
                { isLoading && (<Spinner/>) }
                { !isLoading && !activeProject ? "Set project" : "Change project" }
            </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Set active project</DialogTitle>
                <DialogDescription>
                    Select a project from the list bellow.&nbsp;
                    { activeProject && (<>
                        Current active project is:&nbsp;
                        <span className={"font-bold"}>
                            { activeProject.projectName }
                        </span>
                    </>) }
                </DialogDescription>
            </DialogHeader>
            <div className={"w-full"}>
                { isLoading ? (<div className={"w-full flex flex-row justify-center"}>
                    <Spinner></Spinner>
                </div>) : <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className={"cursor-pointer"}
                                        onClick={() => changeActiveProject(row.original)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div> }

            </div>
        </DialogContent>
    </Dialog>
}

const ProjectSelector = () => {
    const {activeProject} = useProject()

    return <div className={"w-full flex flex-row bg-primary border-b border-muted-foreground"}>
        <div className={"flex flex-col justify-center ml-5"}>
            <div className={"flex flex-row gap-2"}>
                <ChangeActiveProjectDialog />
                { activeProject && (<Label className={"text-secondary font-bold text-xl"}>
                    { activeProject.projectName }
                </Label>) }
            </div>
        </div>
        <div className={"gap-2 p-2"}>
            <div className={"flex flex-row py-1 invisible m-0"}>
                <img className={"h-8 w-1"} src={"/icon.svg"} alt={"logo"}/>
                <div className={"flex flex-col"}>
                    <h1 className={"text-2xl font-semibold tracking-tight text-secondary"}>
                        T
                    </h1>
                </div>
            </div>
        </div>
    </div>
}

export default ProjectSelector;