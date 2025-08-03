import type {TenantDto} from "@/dto/TenantDto.ts";
import {createContext, type FC, type ReactNode, useContext, useEffect, useState} from "react";
import {getAuth} from "@/utils/auth.ts";
import api, {setTenantId} from "@/api.ts";
import type {PageDto} from "@/dto/PageDto.ts";
import {useParams} from "react-router";
import {notifyApiError} from "@/utils/errors.ts";
import type {IdDto} from "@/dto/IdDto.ts";
import type {TenantUserDto} from "@/dto/TenantUserDto.ts";
import {formatQueryParameters} from "@/utils/format.ts";

export type TenantContextType = {
    tenantId: number | null,
    activeTenant: TenantDto | null,
    queryTenants: (userId: number, page: number, pageSize: number, orderBy: string | null) => Promise<PageDto<TenantDto>>,
    queryTenantMembers: (contentTerm: string | null, page: number, pageSize: number, orderBy: string | null) => Promise<PageDto<TenantUserDto>>,
    getTenant: (id: number) => Promise<TenantDto>,
    deleteTenant: (id: number) => Promise<void>,
    saveTenant: (tenant: TenantDto) => Promise<IdDto>,
}

const TenantContext = createContext(null as never as TenantContextType)

export const useTenant = () => {
    return useContext(TenantContext)
}

export const TenantProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [activeTenant, setActiveTenant] = useState(null as TenantDto | null)
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
        setTenantId(tenantIdState)

        if (tenantIdState){
            fetchActiveProject(tenantIdState)
                .then(t => setActiveTenant(t))
                .catch(e => notifyApiError(e))
        } else {
            setActiveTenant(null)
        }
    }, [tenantIdState]);

    const fetchActiveProject = async (activeProjectId: number): Promise<TenantDto | null> => {
        if (!getAuth()){
            return null;
        }

        return await getTenant(activeProjectId)
    }

    const queryTenants = async (userId: number, page: number, pageSize: number, orderBy: string | null): Promise<PageDto<TenantDto>> => {
        let url = `tenants?userId=${userId}&page=${page}&pageSize=${pageSize}`
        if (orderBy){
            url = `${url}&orderBy=${orderBy}`
        }

        const response = await api.get(url)
        return response.data as PageDto<TenantDto>
    }

    const getTenant = async (id: number): Promise<TenantDto> => {
        const response = await api.get(`tenants/tenant?id=${id}`)
        return response.data as TenantDto
    }

    const deleteTenant = (id: number): Promise<void> => {
        return api.delete(`tenants/tenant?id=${id}`)
    }

    const saveTenant = async (tenant: TenantDto): Promise<IdDto> => {
        const response = await api.post('tenants/tenant', tenant)
        const data = response.data as IdDto
        if (tenant.id === tenantIdState){
            await fetchActiveProject(tenantIdState)
                .then(t => setActiveTenant(t))
                .catch(e => notifyApiError(e))
        }

        return data
    }

    const queryTenantMembers = async (contentTerm: string | null, page: number, pageSize: number, orderBy: string | null): Promise<PageDto<TenantUserDto>> => {
        const params: Record<string, string | number> = {
            page,
            pageSize
        }
        if (orderBy){
            params.orderBy = orderBy
        }
        if (contentTerm){
            params.contentTerm = contentTerm
        }

        const response = await api.get(formatQueryParameters('tenants/members', params))
        return response.data as PageDto<TenantUserDto>
    }

    const value: TenantContextType = {
        tenantId: tenantIdState,
        activeTenant,
        queryTenants,
        queryTenantMembers,
        getTenant,
        saveTenant,
        deleteTenant,
    }

    return <TenantContext.Provider value={value}>
        { children }
    </TenantContext.Provider>
}
