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
