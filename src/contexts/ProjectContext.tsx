import type {ProjectDto} from "@/dto/ProjectDto.ts";
import {createContext, type FC, type ReactNode, useContext, useEffect, useState} from "react";
import {getSelectedProjectId, removeSelectedProjectId, setSelectedProjectId} from "@/utils/auth.ts";
import api from "@/api.tsx";
import type {PageDto} from "@/dto/PageDto.ts";

export type ProjectContextType = {
    activeProject: ProjectDto | null,
    changeActiveProject: (project: ProjectDto | null) => void,
    queryProjects: (userId: number, page: number, pageSize: number, orderBy: string | null) => Promise<PageDto<ProjectDto>>,
    getProject: (id: number) => Promise<ProjectDto>,
    deleteProject: (id: number) => Promise<void>,
}

const ProjectContext = createContext(null as never as ProjectContextType)

export const useProject = () => {
    return useContext(ProjectContext)
}

export const ProjectProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [activeProject, setActiveProject] = useState(null as ProjectDto | null)

    useEffect(() => {
        (async () => {
            setActiveProject(await fetchActiveProject())
        })()
    }, []);

    const fetchActiveProject = async (): Promise<ProjectDto | null> => {
        const activeProjectId = getSelectedProjectId()
        if (!activeProjectId){
            return null;
        }

        return await getProject(Number(activeProjectId))
    }

    const queryProjects = async (userId: number, page: number, pageSize: number, orderBy: string | null): Promise<PageDto<ProjectDto>> => {
        let url = `projects?userId=${userId}&page=${page}&pageSize=${pageSize}`
        if (orderBy){
            url = `${url}&orderBy=${orderBy}`
        }

        const response = await api.get(url)
        return response.data as PageDto<ProjectDto>
    }

    const changeActiveProject = (project: ProjectDto | null) => {
        if (!project){
            removeSelectedProjectId()
        } else if (project.id) {
            setSelectedProjectId(project.id)
        }
        setActiveProject(project)
    }

    const getProject = async (id: number): Promise<ProjectDto> => {
        const response = await api.get(`projects/project?id=${id}`)
        return response.data as ProjectDto
    }

    const deleteProject = (id: number): Promise<void> => {
        return api.delete(`projects/project?id=${id}`)
    }

    const value = {
        activeProject,
        changeActiveProject,
        queryProjects,
        getProject,
        deleteProject
    }

    return <ProjectContext.Provider value={value}>
        { children }
    </ProjectContext.Provider>
}
