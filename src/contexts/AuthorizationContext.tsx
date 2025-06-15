import {createContext, type FC, type ReactNode, useContext} from "react";
import api from "../api.tsx"
import type {AuthenticationResponseDto} from "@/dto/AuthenticationResponseDto.ts";
import {storeAuthResponse} from "@/utils/auth.ts";

export type AuthorizationContextType = {
    signInWithEmailAndPassword: (email: string, password: string) => Promise<void>
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

    const value: AuthorizationContextType = {
        signInWithEmailAndPassword
    }

    return <AuthorizationContext.Provider value={value}>
        { children }
    </AuthorizationContext.Provider>
}