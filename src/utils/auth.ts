import type {AuthenticationResponseDto} from "@/dto/AuthenticationResponseDto.ts";

export const storeAuthResponse = (response: AuthenticationResponseDto) => {
    localStorage.setItem("auth", JSON.stringify(response))
}

export const getAuth = (): AuthenticationResponseDto | null => {
    const json = localStorage.getItem("auth")
    if (json === null){
        return null
    }
    return JSON.parse(json) as AuthenticationResponseDto
}

export const removeAuth = () => {
    localStorage.removeItem('auth');
}

export const setSelectedProjectId = (projectId: number) => {
    localStorage.setItem("selectedProject", projectId.toString())
}

export const getSelectedProjectId = (): number | null => {
    const item = localStorage.getItem("selectedProject")
    if (!item){
        return null;
    }

    return Number(item)
}

export const removeSelectedProjectId = () => {
    localStorage.removeItem("selectedProject")
}