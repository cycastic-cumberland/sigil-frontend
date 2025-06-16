import {createContext, type FC, type ReactNode, useContext} from "react";
import api from "../api.tsx"
import type {AuthenticationResponseDto} from "@/dto/AuthenticationResponseDto.ts";
import {removeAuth, removeSelectedProjectId, storeAuthResponse} from "@/utils/auth.ts";

export type AuthorizationContextType = {
    signInWithEmailAndPassword: (email: string, password: string) => Promise<void>
    invalidateAllSessions: (userId: number) => Promise<void>
    localLogout: () => void
}

const AuthorizationContext = createContext(null as never as AuthorizationContextType)

export const useAuthorization = () => {
    return useContext(AuthorizationContext)
}

export const AuthorizationProvider: FC<{ children?: ReactNode }> = ({ children }) => {
    const signInWithEmailAndPassword = async (email: string, password: string): Promise<void> => {
        const response = await api.post("auth", { email, password })
        const authResponse = response.data as AuthenticationResponseDto;
        storeAuthResponse(authResponse)
    }

    const invalidateAllSessions = async (userId: number): Promise<void> => {
        await api.post("auth/invalidate", { userId })
    }

    const localLogout = () => {
        removeAuth()
        removeSelectedProjectId()
        window.location.href = '/login'
    }

    const value: AuthorizationContextType = {
        signInWithEmailAndPassword,
        invalidateAllSessions,
        localLogout,
    }

    return <AuthorizationContext.Provider value={value}>
        { children }
    </AuthorizationContext.Provider>
}