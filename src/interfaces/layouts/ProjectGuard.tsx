import type {FC, ReactNode} from "react";
import {useProject} from "@/contexts/ProjectContext.tsx";
import {Label} from "@/components/ui/label.tsx";

const ProjectGuard: FC<{ children?: ReactNode | ReactNode[] }> = ({ children }) => {
    const {activeProject} = useProject()

    return <>
        { activeProject ? children : <div className={"flex flex-col flex-grow w-full justify-center gap-2"}>
            <div className={"w-full flex flex-row justify-center"}>
                <Label className={"text-secondary font-bold text-4xl"}>
                    No project selected
                </Label>
            </div>
            <div className={"w-full flex flex-row justify-center"}>
                <p className={"text-muted-foreground"}>
                    Use the&nbsp;
                    <span className={"font-bold"}>
                        Set project&nbsp;
                    </span>
                    <span>
                        button on the top bar to choose an active project.
                    </span>
                </p>
            </div>
        </div> }
    </>
}

export default ProjectGuard;