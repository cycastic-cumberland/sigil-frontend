import {useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog.tsx";
import {useProject} from "@/contexts/ProjectContext.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {Label} from "@/components/ui/label.tsx";
import ProjectTable from "@/interfaces/components/ProjectTable.tsx";

const ChangeActiveProjectDialog = () => {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const {activeProject, changeActiveProject} = useProject()
    const [counter, setCounter] = useState(0)

    return <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <button disabled={isLoading}
                    className={"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border shadow-xs h-9 px-4 py-2 has-[>svg]:px-3 cursor-pointer bg-secondary text-primary hover:bg-foreground hover:text-secondary"}
                    onClick={() => setCounter(c => c + 1)}>
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
            <ProjectTable key={counter} isLoading={isLoading} setIsLoading={setIsLoading} onSelect={changeActiveProject}/>
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