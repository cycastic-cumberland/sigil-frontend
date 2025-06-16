import axios from 'axios';
import type {AuthenticationResponseDto} from "@/dto/AuthenticationResponseDto.ts";
import {getAuth, getSelectedProjectId, removeAuth, storeAuthResponse} from "@/utils/auth.ts";

const BACKEND_AUTHORITY: string = import.meta.env.VITE_BACKEND_AUTHORITY;

console.log("Backend authority:", BACKEND_AUTHORITY)

const api = axios.create({
    baseURL: `${BACKEND_AUTHORITY}/api`,
});

api.interceptors.request.use(config => {
    const auth = getAuth();
    if (auth) {
        config.headers.Authorization = `Bearer ${auth.authToken}`;
    }
    const projectId = getSelectedProjectId();
    if (projectId){
        config.headers["X-Project-Id"] = projectId.toString()
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
                removeAuth()
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // If already retried or another 401, redirect
        if (status === 401) {
            removeAuth()
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
