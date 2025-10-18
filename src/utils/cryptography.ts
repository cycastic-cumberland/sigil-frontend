import MD5 from 'crypto-js/md5';
import {enc} from 'crypto-js';
import type {Prf} from "@/dto/cryptography/webauthn.ts";
// @ts-ignore
import argon2 from 'argon2-browser/dist/argon2-bundled.min.js';
import type {
    EnrollPasswordBasedCipherDto,
    EnrollPasswordBasedCipherSignedDto
} from "@/dto/cryptography/EnrollPasswordBasedCipherDto.ts";

export type EncodedKeyPair = {
    publicKey: Uint8Array,
    privateKey: Uint8Array
}

export type SymmetricEncryptionResult<T extends string | Uint8Array> = {
    cipherText: T,
    iv: T
}

export type SymmetricEncryptionProps<T extends string | Uint8Array> = {
    content: T,
    key: T | CryptoKey,
    iv?: T,
}

export type RequireEncryptionKey = {
    userPrivateKey: CryptoKey
}

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

const encryptAESGCMInternal = async (props: SymmetricEncryptionProps<Uint8Array>): Promise<SymmetricEncryptionResult<Uint8Array>> => {
    const {content, key: inputKey, iv: inputIv} = props
    const iv = inputIv ? inputIv : crypto.getRandomValues(new Uint8Array(12))
    const key = inputKey instanceof CryptoKey ? inputKey : await crypto.subtle.importKey(
        "raw",
        inputKey,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    )

    const encryptedContent = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        content
    )

    return {
        cipherText: new Uint8Array(encryptedContent),
        iv
    }
}

export const encryptAESGCM = async <T extends string | Uint8Array>(props: SymmetricEncryptionProps<T>): Promise<SymmetricEncryptionResult<T>> => {
    if (typeof props.content === 'string' && (typeof props.key === 'string' || props.key instanceof CryptoKey) && (typeof props.iv === 'string' || typeof props.iv === 'undefined')){
        const {content, key, iv} = props
        const result = await encryptAESGCMInternal({
            content: base64ToUint8Array(content),
            key: !(key instanceof CryptoKey) ? base64ToUint8Array(key) : key,
            iv: iv && base64ToUint8Array(iv),
        })

        return {
            cipherText: uint8ArrayToBase64(result.cipherText),
            iv: iv ? iv : uint8ArrayToBase64(result.iv)
        } as SymmetricEncryptionResult<T>
    } else {
        const result = await encryptAESGCMInternal(props as SymmetricEncryptionProps<Uint8Array>)
        return result as SymmetricEncryptionResult<T>
    }
}

export const decryptAESGCM = async <T extends string | Uint8Array>(encryptedData: T, iv: T, inputKey: Uint8Array | CryptoKey): Promise<T> => {
    let encodeBase64 = false
    let encryptedDataBytes = encryptedData as Uint8Array
    let ivBytes = iv as Uint8Array
    if (!(encryptedData instanceof Uint8Array)){
        encodeBase64 = true;
        encryptedDataBytes = base64ToUint8Array(encryptedData)
        ivBytes = base64ToUint8Array(iv as string)
    }
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
            iv: ivBytes,
            tagLength: 128
        },
        key,
        encryptedDataBytes
    );

    const decryptedBytes = new Uint8Array(plaintextBuffer)
    if (!encodeBase64){
        return decryptedBytes as T
    }

    return uint8ArrayToBase64(decryptedBytes) as T
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

export const verifyWithSHA256withRSAPSS = async (key: CryptoKey, data: Uint8Array, signature: Uint8Array): Promise<boolean> => {
    return crypto.subtle.verify(
        {
            name: "RSA-PSS",
            saltLength: 32
        },
        key,
        signature,
        data
    )
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

const arrayBufferToBase64 = (bytes: Uint8Array) => {
    let binary = '';
    for (const b of bytes) {
        binary += String.fromCharCode(b);
    }
    return btoa(binary);
}

export const toPem = async (key: CryptoKey) => {
    if (key.type !== "public" && key.type !== "private"){
        throw Error("CryptoKey not supported")
    }
    if (!key.extractable){
        throw Error("CryptoKey is not extractable")
    }
    const keyBytes = await crypto.subtle.exportKey(key.type === 'public' ? 'spki' : 'pkcs8', key)
    const base64 = arrayBufferToBase64(new Uint8Array(keyBytes));
    const match = base64.match(/.{1,64}/g)
    if (!match){
        throw Error("Failed to serialize key to PEM")
    }
    const formatted = match.join('\n');
    return `-----BEGIN ${key.type === 'public' ? 'PUBLIC' : 'PRIVATE'} KEY-----\n${formatted}\n-----END ${key.type === 'public' ? 'PUBLIC' : 'PRIVATE'} KEY-----`;
}

export const createPrivateKey = (pkcs8: Uint8Array, isSign: boolean) => {
    return crypto.subtle.importKey(
        "pkcs8",
        pkcs8,
        {
            name: isSign ? 'RSA-PSS' : 'RSA-OAEP',
            hash: { name: 'SHA-256' }
        },
        true,
        [isSign ? "sign" : "decrypt"]
    )
}

export const createPublicKey = (pem: Uint8Array, isVerify: boolean) => {
    return crypto.subtle.importKey(
        "spki",
        pem,
        {
            name: isVerify ? 'RSA-PSS' : 'RSA-OAEP',
            hash: { name: 'SHA-256' }
        },
        true,
        [isVerify ? "verify" : "encrypt"]
    )
}

export const importPrivateKeyFromPem = (pem: string, isSign?: boolean) => {
    const cleanPem = pem
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replace(/\s/g, "")

    // Import the key
    return createPrivateKey(base64ToUint8Array(cleanPem), isSign ?? false)
}

export const tryEncryptText = async <T extends string | undefined>(key: CryptoKey, base64Content: T, iv: Uint8Array): Promise<T> => {
    if (!base64Content){
        return undefined as T
    }

    const encoder = new TextEncoder();
    const encodedContent = encoder.encode(base64Content)
    return uint8ArrayToBase64((await encryptAESGCM({
        key,
        iv,
        content: encodedContent
    })).cipherText) as T
}

export const tryDecryptText = async <T extends string | undefined>(key: CryptoKey, encryptedBase64Content: T, iv: Uint8Array | undefined): Promise<T> => {
    if (!encryptedBase64Content || !iv){
        return undefined as T
    }

    try {
        const decrypted = await decryptAESGCM(base64ToUint8Array(encryptedBase64Content as string), iv, key)
        const decoder = new TextDecoder();
        return decoder.decode(decrypted) as T
    } catch (e){
        if (e instanceof DOMException && e.name === "OperationError"){
            throw Error("Corrupted data detected")
        }
        throw e
    }
}

export const toEnrollPasswordBasedCipher = async <T extends CryptoKey | Uint8Array>(password: string, privateKey: T): Promise<EnrollPasswordBasedCipherDto> => {
    const parallelism = 1
    const memory = 32768
    const iterations = 3
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const encoder = new TextEncoder()
    const parameters = new Uint8Array(12)
    const parametersView = new DataView(parameters.buffer, parameters.byteOffset, parameters.byteLength)
    parametersView.setUint32(0, parallelism, true)
    parametersView.setUint32(4, memory, true)
    parametersView.setUint32(8, iterations, true)
    const parametersBase64 = uint8ArrayToBase64(parameters)

    const derivedKey = await deriveArgon2idKey(encoder.encode(password), salt, iterations, memory, parallelism, 32)
    const encryptionKey = await crypto.subtle.importKey(
        "raw",
        derivedKey,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    )

    let keyBytes: Uint8Array
    if (privateKey instanceof CryptoKey){
        keyBytes = new Uint8Array(await crypto.subtle.exportKey('pkcs8', privateKey))
    } else {
        keyBytes = privateKey
    }

    const nonce = crypto.getRandomValues(new Uint8Array(12))
    const encryptedPkcs8 = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonce },
        encryptionKey,
        keyBytes
    )

    const keyDerivationSettings = `argon2id$${uint8ArrayToBase64(salt)}$${parametersBase64}`
    return {
        keyDerivationSettings,
        cipher: {
            decryptionMethod: "USER_PASSWORD",
            iv: uint8ArrayToBase64(nonce),
            cipher: uint8ArrayToBase64(new Uint8Array(encryptedPkcs8))
        }
    }
}

export const toEnrollPasswordBasedCipherSigned = async <T extends CryptoKey | Uint8Array>(password: string, privateKey: T): Promise<EnrollPasswordBasedCipherSignedDto> => {
    let keyBytes: Uint8Array
    if (privateKey instanceof CryptoKey){
        keyBytes = new Uint8Array(await crypto.subtle.exportKey('pkcs8', privateKey))
    } else {
        keyBytes = privateKey
    }

    const data = await toEnrollPasswordBasedCipher(password, keyBytes)
    const signingKey = await createPrivateKey(keyBytes, true)
    const signature = await signWithSHA256withRSAPSS(signingKey, base64ToUint8Array(data.cipher.cipher))
    return {
        ...data,
        signatureAlgorithm: 'SHA256withRSA/PSS',
        signature: uint8ArrayToBase64(signature)
    }
}
