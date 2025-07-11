import type {TenantDto} from "@/dto/TenantDto.ts";
import {createContext, type FC, type ReactNode, useContext, useEffect, useState} from "react";
import {getAuth, getSelectedProjectId, removeSelectedProjectId, setSelectedProjectId} from "@/utils/auth.ts";
import api from "@/api.tsx";
import type {PageDto} from "@/dto/PageDto.ts";

export type TenantContextType = {
    activeProject: TenantDto | null,
    changeActiveProject: (project: TenantDto | null) => void,
    queryProjects: (userId: number, page: number, pageSize: number, orderBy: string | null) => Promise<PageDto<TenantDto>>,
    getProject: (id: number) => Promise<TenantDto>,
    deleteProject: (id: number) => Promise<void>,
}

const TenantContext = createContext(null as never as TenantContextType)

export const useTenant = () => {
    return useContext(TenantContext)
}

export const TenantProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [activeProject, setActiveProject] = useState(null as TenantDto | null)

    useEffect(() => {
        (async () => {
            setActiveProject(await fetchActiveProject())
        })()
    }, []);

    const fetchActiveProject = async (): Promise<TenantDto | null> => {
        if (!getAuth()){
            return null;
        }
        const activeProjectId = getSelectedProjectId()
        if (!activeProjectId){
            return null;
        }

        return await getProject(Number(activeProjectId))
    }

    const queryProjects = async (userId: number, page: number, pageSize: number, orderBy: string | null): Promise<PageDto<TenantDto>> => {
        let url = `tenants?userId=${userId}&page=${page}&pageSize=${pageSize}`
        if (orderBy){
            url = `${url}&orderBy=${orderBy}`
        }

        const response = await api.get(url)
        return response.data as PageDto<TenantDto>
    }

    const changeActiveProject = (project: TenantDto | null) => {
        if (!project){
            removeSelectedProjectId()
        } else if (project.id) {
            setSelectedProjectId(project.id)
        }
        setActiveProject(project)
    }

    const getProject = async (id: number): Promise<TenantDto> => {
        const response = await api.get(`tenants/tenant?id=${id}`)
        return response.data as TenantDto
    }

    const deleteProject = (id: number): Promise<void> => {
        return api.delete(`tenants/tenant?id=${id}`)
    }

    const value = {
        activeProject,
        changeActiveProject,
        queryProjects,
        getProject,
        deleteProject
    }

    return <TenantContext.Provider value={value}>
        { children }
    </TenantContext.Provider>
}
