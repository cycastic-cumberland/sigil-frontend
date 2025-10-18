import type {AuthenticationResponseDto} from "@/dto/user/AuthenticationResponseDto.ts";
import type {UserRole} from "@/dto/user/UserInfoDto.ts";

const passwordValidationRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[`~!@#$%^&*()_+{}|:"<>?\[\]\\;',.]).{8,}$/;

export const PasswordValidationText = "Password must be at least 8 character long, have at least one lower case character, one upper case character, one number and one special character.";

type JwtPayload = {
    roles: UserRole[]
}

export const validatePassword = (password: string) => passwordValidationRegex.test(password)

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

export const getUserRole = (): UserRole[] | null => {
    const auth = getAuth()
    if (!auth){
        return null
    }

    const payload = auth.authToken.split(".").filter(s => s)[1]
    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as JwtPayload
    return decodedPayload.roles
}
