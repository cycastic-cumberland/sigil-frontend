export const getCookie = (name: string)  => {
    const match = document.cookie
        .split('; ')
        .find(pair => pair.startsWith(`${encodeURIComponent(name)}=`));
    return match
        ? decodeURIComponent(match.split('=')[1])
        : null;
}

export const setCookie = <T>(name: string, value: T, expires: Date) => {
    document.cookie = [
        `${encodeURIComponent(name)}=${encodeURIComponent(`${value}`)}`,
        `expires=${expires.toUTCString()}`,
        'path=/'
    ].join('; ');
}
