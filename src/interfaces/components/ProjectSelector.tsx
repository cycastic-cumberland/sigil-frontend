import {useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog.tsx";
import {useProject} from "@/contexts/ProjectContext.tsx";
import {Spinner} from "@/components/ui/shadcn-io/spinner";
import {Label} from "@/components/ui/label.tsx";
import ProjectTable from "@/interfaces/components/ProjectTable.tsx";
import {useSidebar} from "@/components/ui/sidebar.tsx";
import {Button} from "@/components/ui/button.tsx";
import useMediaQuery from "@/hooks/use-media-query.tsx";
import {Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from "@/components/ui/drawer.tsx";
import type {ProjectDto} from "@/dto/ProjectDto.ts";

const ChangeActiveProjectDialog = () => {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const {activeProject, changeActiveProject} = useProject()
    const [counter, setCounter] = useState(0)
    const isDesktop = useMediaQuery("(min-width: 768px)")

    const onSelect = async (project: ProjectDto) => {
        changeActiveProject(project)
        setOpen(false)
    }

    return <>
        <Button disabled={isLoading}
                className={'cursor-pointer bg-foreground text-background hover:bg-background hover:text-foreground border-1 border-foreground'}
                onClick={() => { setCounter(c => c + 1); setOpen(true); }}>
            { isLoading && (<Spinner/>) }
            { !isLoading && !activeProject ? "Set project" : "Change project" }
        </Button>
        { isDesktop ? <Dialog open={open} onOpenChange={setOpen}>
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
                <ProjectTable key={counter}
                              isLoading={isLoading}
                              setIsLoading={setIsLoading}
                              onSelect={changeActiveProject}
                              isDialog/>
            </DialogContent>
        </Dialog> : <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Set active project</DrawerTitle>
                    <DrawerDescription>
                        Select a project from the list bellow.&nbsp;
                        { activeProject && (<>
                            Current active project is:&nbsp;
                            <span className={"font-bold"}>
                            { activeProject.projectName }
                        </span>
                        </>) }
                    </DrawerDescription>
                </DrawerHeader>
                <div className={'w-full px-3 pb-3'}>
                    <ProjectTable key={counter}
                                  isLoading={isLoading}
                                  setIsLoading={setIsLoading}
                                  onSelect={onSelect}
                                  isDialog/>
                </div>
            </DrawerContent>
        </Drawer> }
    </>
}

const ProjectSelector = () => {
    const {activeProject} = useProject()
    const {toggleSidebar} = useSidebar()
    const isDesktop = useMediaQuery("(min-width: 768px)")

    return <div className={"w-full flex flex-row bg-background border-b border-sidebar min-h-16"}>
        { !isDesktop && <button className={"gap-2 p-2 appearance-none bg-transparent border-none m-0 focus:outline-none cursor-pointer"} onClick={toggleSidebar}>
            <div className={"flex flex-row py-1 m-0"}>
                <div className={"flex flex-col"}>
                    <h1 className={"text-2xl font-semibold tracking-tight invisible"}>
                        T
                    </h1>
                </div>
                <img className={"h-8 aspect-square"} src={"/icon.svg"} alt={"logo"}/>
            </div>
        </button> }
        <div className={`flex items-center gap-2 ${isDesktop ? 'ml-5' : ''}`}>
            <ChangeActiveProjectDialog />
            {activeProject && (
                <Label className="text-foreground font-bold text-xl">
                    {activeProject.projectName}
                </Label>
            )}
        </div>
    </div>
}

export default ProjectSelector;