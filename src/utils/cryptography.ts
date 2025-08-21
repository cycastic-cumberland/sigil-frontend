import MD5 from 'crypto-js/md5';
import {enc} from 'crypto-js';
import type {Prf} from "@/dto/cryptography/webauthn.ts";
// @ts-ignore
import argon2 from 'argon2-browser/dist/argon2-bundled.min.js';

export type EncodedKeyPair = { publicKey: Uint8Array, privateKey: Uint8Array }

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

export const decryptAESGCM = async (encryptedData: Uint8Array, iv: Uint8Array, inputKey: Uint8Array | CryptoKey): Promise<Uint8Array> => {
    const key = inputKey instanceof CryptoKey ? inputKey : await crypto.subtle.importKey(
        "raw",
        inputKey,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    )

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

export const encryptWithPublicKey = async <T extends string | Uint8Array>(key: CryptoKey, data: T): Promise<T> => {
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

export const decryptWithPrivateKey = async <T extends string | Uint8Array>(key: CryptoKey, data: T): Promise<T> => {
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

export const signWithSHA256withRSAPSS = async (key: CryptoKey, data: Uint8Array): Promise<Uint8Array> => {
    const sig = await crypto.subtle.sign(
        {
            name: "RSA-PSS",
            saltLength: 32,
        },
        key,
        data
    );
    return new Uint8Array(sig)
}

export const deriveEncryptionKeyFromWebAuthnPrf = async (prf: Prf) => {
    const ikm = prf.results.first
    const keyDerivationKey = await crypto.subtle.importKey(
        "raw",
        ikm,
        "HKDF",
        false,
        ["deriveKey"],
    );
    return await crypto.subtle.deriveKey(
        {name: "HKDF", info: new Uint8Array(), salt: new Uint8Array(32), hash: "SHA-256"},
        keyDerivationKey,
        {name: "AES-GCM", length: 256},
        false,
        ["encrypt", "decrypt"],
    )
}

export const generateRsaOaepWithSha256KeyPair = () => {
    return crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
}

export const generateEncodedRsaOaepWithSha256KeyPair = async (): Promise<EncodedKeyPair> => {
    const keyPair = await generateRsaOaepWithSha256KeyPair()
    const publicDer  = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    const privateDer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    return {
        publicKey: new Uint8Array(publicDer), // X.509
        privateKey: new Uint8Array(privateDer), // PKCS#8
    }
}

export const deriveArgon2idKey = async (pass: Uint8Array, salt: Uint8Array, time: number, mem: number, parallelism: number, hashLen: number): Promise<Uint8Array> => {
    const result = await argon2.hash({
        pass,
        type: argon2.ArgonType.Argon2id,
        salt,
        time,
        mem,
        parallelism,
        hashLen ,
    })

    return result.hash
}

