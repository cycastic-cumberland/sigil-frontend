import axios from 'axios';
import type {AuthenticationResponseDto} from "@/dto/AuthenticationResponseDto.ts";
import {getAuth, removeAuth, storeAuthResponse} from "@/utils/auth.ts";
import {extractError} from "@/utils/errors.ts";

export const BACKEND_AUTHORITY: string = import.meta.env.VITE_BACKEND_AUTHORITY;

let projectId = null as number | null

export const setProjectId = (id: number | null) => {
    projectId = id
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
        if (auth && projectId){
            config.headers["X-Tenant-Id"] = projectId.toString()
        }
        if (auth && projectId && partitionIdRef && partitionIdRef.current){
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
                    originalRequest.headers.Authorization = `Bearer ${authResponse.authToken}`;
                    return axios(originalRequest);
                } catch (refreshError) {
                    redirectWithError(error)
                    return Promise.reject(refreshError);
                }
            }

            // If already retried or another 401, redirect
            if (status === 401) {
                redirectWithError(error)
            }
            return Promise.reject(error);
        }
    );

    return api;
}

const api = createApi(null)

export default api;
