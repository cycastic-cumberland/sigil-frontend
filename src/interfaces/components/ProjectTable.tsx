import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {type ColumnDef, flexRender, getCoreRowModel, useReactTable} from "@tanstack/react-table";
import {type FC, useEffect, useMemo, useState} from "react";
import type {ProjectDto} from "@/dto/ProjectDto.ts";
import {getAuth} from "@/utils/auth.ts";
import type {PageDto} from "@/dto/PageDto.ts";
import {useProject} from "@/contexts/ProjectContext.tsx";

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

const ProjectTable: FC<{
    isLoading: boolean,
    setIsLoading: (b: boolean) => void,
    onSelect: (p: ProjectDto) => void,
    applyTheme?: boolean,
}> = ({ isLoading, setIsLoading, onSelect, applyTheme }) => {
    const [page, setPage] = useState({ items: [], pageSize: 0, page: 1, totalPages: 0, totalElements: 0 } as PageDto<ProjectDto>)
    const tableData = useMemo(() => page.items, [page])
    const {queryProjects} = useProject()
    const columns = useMemo(() => projectSelectorColumnDef, [])
    const table = useReactTable({
        data: tableData,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    useEffect(() => {
        (async () => {
            setIsLoading(true)
            try {
                const data = await queryProjects(getAuth()!.userId, 1, 5, null)
                setPage(data)
            } finally {
                setIsLoading(false)
            }
        })()
    }, []);

    return <div className={"w-full"}>
        <div className={`rounded-md border ${applyTheme ? 'border-secondary' : ''}`}>
            <Table className={applyTheme ? 'text-secondary': ''}>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead key={header.id} className={applyTheme ? 'text-secondary': ''}>
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
                    {isLoading ? <TableRow>
                        <TableCell colSpan={columns.length}
                                   className="h-24 text-secondary text-xl font-bold">
                            <div className={"flex flex-row justify-center items-center content-center w-full"}>
                                <Spinner/>
                            </div>
                        </TableCell>
                    </TableRow> : table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                                className={"cursor-pointer"}
                                onClick={() => onSelect(row.original)}
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
        </div>
    </div>
}

export default ProjectTable;