export const format = (template: string, ...args: unknown[]): string => {
    const copiedArgs = [...args]
    for(;; copiedArgs.length){
        const i = template.indexOf("{}")
        if (i === -1){
            break
        }

        const lhs = template.slice(0, i)
        const rhs = template.slice(i + "{}".length)
        template = lhs + String(copiedArgs[0]) + rhs

        copiedArgs.shift()
    }

    return template
}

export const formatQueryParameters = (baseUrl: string, params: Record<string, string | number>) => {
    const encodedParams = Object.keys(params)
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(`${params[k]}`)}`)
        .join("&")

    return `${baseUrl}?${encodedParams}`
}

export const humanizeFileSize = (bytes: number, si = true, dp = 1) => {
    const thresh = si ? 1000 : 1024;

    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }

    const units = si
        ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let u = -1;
    const r = 10 ** dp;

    do {
        bytes /= thresh;
        ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

    return bytes.toFixed(dp) + ' ' + units[u];
}
