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
