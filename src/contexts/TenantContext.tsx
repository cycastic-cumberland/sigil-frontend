import type {TenantDto} from "@/dto/TenantDto.ts";
import {createContext, type FC, type ReactNode, useContext, useEffect, useState} from "react";
import {getAuth} from "@/utils/auth.ts";
import api, {setProjectId} from "@/api.ts";
import type {PageDto} from "@/dto/PageDto.ts";
import {useParams} from "react-router";
import {notifyApiError} from "@/utils/errors.ts";

export type TenantContextType = {
    tenantId: number | null,
    activeProject: TenantDto | null,
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
    const [tenantIdState, setTenantIdState] = useState(null as number | null)
    const { tenantId } = useParams();

    useEffect(() => {
        try {
            if (!tenantId){
                setTenantIdState(null)
                return
            }
            const parsedId = Number(tenantId)
            setTenantIdState(parsedId)
        } catch (e){
            console.error(e)
            setTenantIdState(null)
        }
    }, [tenantId]);

    useEffect(() => {
        setProjectId(tenantIdState)

        if (tenantIdState){
            fetchActiveProject(tenantIdState)
                .then(t => setActiveProject(t))
                .catch(e => notifyApiError(e))
        } else {
            setActiveProject(null)
        }
    }, [tenantIdState]);

    const fetchActiveProject = async (activeProjectId: number): Promise<TenantDto | null> => {
        if (!getAuth()){
            return null;
        }

        return await getProject(activeProjectId)
    }

    const queryProjects = async (userId: number, page: number, pageSize: number, orderBy: string | null): Promise<PageDto<TenantDto>> => {
        let url = `tenants?userId=${userId}&page=${page}&pageSize=${pageSize}`
        if (orderBy){
            url = `${url}&orderBy=${orderBy}`
        }

        const response = await api.get(url)
        return response.data as PageDto<TenantDto>
    }

    const getProject = async (id: number): Promise<TenantDto> => {
        const response = await api.get(`tenants/tenant?id=${id}`)
        return response.data as TenantDto
    }

    const deleteProject = (id: number): Promise<void> => {
        return api.delete(`tenants/tenant?id=${id}`)
    }

    const value: TenantContextType = {
        tenantId: tenantIdState,
        activeProject,
        queryProjects,
        getProject,
        deleteProject
    }

    return <TenantContext.Provider value={value}>
        { children }
    </TenantContext.Provider>
}
