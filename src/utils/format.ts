const format = (template: string, ...args: unknown[]): string => {
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

export default format