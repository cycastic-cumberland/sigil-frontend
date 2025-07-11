import axios from 'axios';
import type {AuthenticationResponseDto} from "@/dto/AuthenticationResponseDto.ts";
import {getAuth, getSelectedProjectId, removeAuth, storeAuthResponse} from "@/utils/auth.ts";
import {extractError} from "@/utils/errors.ts";
import type {RefObject} from "react";
import {base64ToUint8Array} from "@/utils/cryptography.ts";

export const BACKEND_AUTHORITY: string = import.meta.env.VITE_BACKEND_AUTHORITY;

const redirectWithError = (e: unknown) => {
    removeAuth()
    window.location.href = `/login?error=${extractError(e) ?? "Please sign in again"}`;
}

export const createApi = (partitionIdRef: RefObject<number | null> | null) => {
    const api = axios.create({
        baseURL: `${BACKEND_AUTHORITY}/api`,
    });

    api.interceptors.request.use(config => {
        const auth = getAuth();
        if (auth) {
            config.headers.Authorization = `Bearer ${auth.authToken}`;
        }
        const projectId = getSelectedProjectId();
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

export const getServerEphemeralKey = async (): Promise<{ publicKey: CryptoKey, version: number }> => {
    const response = await api.get("auth/public-key")
    const data = response.data as { publicKey: string, version: number }
    const cleanPem = data.publicKey
        .replace("-----BEGIN PUBLIC KEY-----", "")
        .replace("-----END PUBLIC KEY-----", "")
        .replace(/\s/g, "");
    const pem = base64ToUint8Array(cleanPem)
    const publicKey = await crypto.subtle.importKey(
        "spki",
        pem,
        {
            name: 'RSA-OAEP',
            hash: { name: 'SHA-256' }
        },
        false,
        ["encrypt"]
    );

    return {
        publicKey,
        version: data.version
    }
}
