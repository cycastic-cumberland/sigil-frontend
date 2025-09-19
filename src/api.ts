import axios from 'axios';
import type {AuthenticationResponseDto} from "@/dto/user/AuthenticationResponseDto.ts";
import {getAuth, removeAuth, storeAuthResponse} from "@/utils/auth.ts";
import {extractError} from "@/utils/errors.ts";
import type {Callback} from "@/utils/misc.ts";

export const BACKEND_AUTHORITY: string = import.meta.env.VITE_BACKEND_AUTHORITY

type TokenRefreshTrigger = Callback<AuthenticationResponseDto | null>

let tenantId = null as number | null
let tokenRefreshTriggers: TokenRefreshTrigger[] = []

export const setTenantId = (id: number | null) => {
    tenantId = id
}

export const onTokenRefreshEvent = (trigger: TokenRefreshTrigger) => {
    if (tokenRefreshTriggers.includes(trigger)){
        return () => {}
    }

    tokenRefreshTriggers.push(trigger)
    return () => tokenRefreshTriggers = tokenRefreshTriggers.filter(t => t !== trigger)
}

const redirectWithError = (e: unknown) => {
    removeAuth()
    window.location.href = `/login?error=${extractError(e) ?? "Please sign in again"}`;
}

export const createApi = (partitionIdRef: { current: number | null } | null) => {
    const api = axios.create({
        baseURL: `${BACKEND_AUTHORITY}/api`,
    });

    api.interceptors.request.use(config => {
        const auth = getAuth();
        if (auth) {
            config.headers.Authorization = `Bearer ${auth.authToken}`;
        }
        if (auth && tenantId){
            config.headers["X-Tenant-Id"] = tenantId.toString()
        }
        if (auth && tenantId && partitionIdRef && partitionIdRef.current){
            config.headers["X-Partition-Id"] = partitionIdRef.current.toString()
        }
        return config;
    }, error => Promise.reject(error));

    api.interceptors.response.use(
        response => response,
        async error => {
            const originalRequest = error.config;
            const status = error.response ? error.response.status : null;
            const isLoginPage = window.location.pathname === '/login';

            if (isLoginPage) {
                return Promise.reject(error);
            }

            if (status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                try {
                    const auth = getAuth();
                    if (!auth) throw new Error('No refresh token');

                    const { data } = await axios.put(`${BACKEND_AUTHORITY}/api/auth`, { authToken: auth.authToken });
                    if (!data) throw new Error('No token in refresh response');

                    const authResponse = data as AuthenticationResponseDto;
                    storeAuthResponse(authResponse)
                    for (const tokenRefreshTrigger of tokenRefreshTriggers) {
                        tokenRefreshTrigger(authResponse)
                    }
                    originalRequest.headers.Authorization = `Bearer ${authResponse.authToken}`;
                    return axios(originalRequest);
                } catch (refreshError) {
                    redirectWithError(error)
                    return Promise.reject(refreshError);
                }
            }

            // If already retried or another 401, redirect
            if (status === 401) {
                for (const tokenRefreshTrigger of tokenRefreshTriggers) {
                    tokenRefreshTrigger(null)
                }
                redirectWithError(error)
            }
            return Promise.reject(error);
        }
    );

    return api;
}

const api = createApi(null)

export default api;
