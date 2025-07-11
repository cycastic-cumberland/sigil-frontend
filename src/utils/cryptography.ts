import MD5 from 'crypto-js/md5';
import { enc } from 'crypto-js';

export const base64ToUint8Array = (base64: string) =>
    Uint8Array.from(window.atob(base64), v => v.charCodeAt(0));

export const uint8ArrayToBase64 = (u8: Uint8Array) => {
    let binary = "";
    for (let i = 0; i < u8.byteLength; i++) {
        binary += String.fromCharCode(u8[i]);
    }
    return btoa(binary);
}

export const digestSha256 = async (data: Uint8Array) => {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(hashBuffer);
}

export const digestMd5 = (data: Uint8Array) => {
    const wordArray = enc.Latin1.parse(
        Array.from(data, b => String.fromCharCode(b)).join('')
    );
    const hash = MD5(wordArray).toString(enc.Hex);
    return new Uint8Array(hash.match(/.{2}/g)!.map(h => parseInt(h, 16)));
}

export const decryptAESGCM = async (encryptedData: Uint8Array, iv: Uint8Array, keyRaw: Uint8Array): Promise<Uint8Array> => {
    const key = await crypto.subtle.importKey(
        "raw",
        keyRaw,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    const plaintextBuffer = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv,
            tagLength: 128
        },
        key,
        encryptedData
    );

    return new Uint8Array(plaintextBuffer)
}

export async function encryptWithPublicKey<T extends string | Uint8Array>(key: CryptoKey, data: T): Promise<T> {
    let encodeBase64 = false;

    let bytes = data as Uint8Array
    if (!(data instanceof Uint8Array)){
        encodeBase64 = true
        bytes = base64ToUint8Array(data)
    }

    const plainBuf = new Uint8Array(await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        key,
        bytes
    ));

    if (!encodeBase64){
        return plainBuf as T
    }

    return uint8ArrayToBase64(plainBuf) as T
}

export async function decryptWithPrivateKey<T extends string | Uint8Array>(key: CryptoKey, data: T): Promise<T> {
    let encodeBase64 = false;

    let bytes = data as Uint8Array
    if (!(data instanceof Uint8Array)){
        encodeBase64 = true
        bytes = base64ToUint8Array(data)
    }

    const plainBuf = new Uint8Array(await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        key,
        bytes
    ));

    if (!encodeBase64){
        return plainBuf as T
    }

    return uint8ArrayToBase64(plainBuf) as T
}