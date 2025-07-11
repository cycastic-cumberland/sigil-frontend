export type ListingPathFragment = {
    display: string,
    url: string,
    isPartition: boolean,
}

export const splitByFirst= (str: string, separator: string): string[] => {
    const i = str.indexOf(separator);
    if (i < 0) return [str];
    return [
        str.slice(0, i),
        str.slice(i + separator.length)
    ];
}

export const extractAndEncodePathFragments = (dir: string): ListingPathFragment[] => {
    const split = dir.split('/').filter(s => s);
    switch (split.length){
        case 0:{
            return [{ display: '/', url: '/', isPartition: false }]
        }
        default: {
            let partitionEncountered = false
            const currSlices = [{ display: '/', url: '/', isPartition: false }]
            let lastFragment = '/'
            for (const fragment of split) {
                if (fragment === '_' && !partitionEncountered){
                    const s = currSlices[currSlices.length - 1]
                    s.url = s.url + '_/'
                    s.isPartition = true

                    partitionEncountered = true
                    continue
                }
                lastFragment = `${lastFragment}${encodeURIComponent(fragment)}/`
                currSlices.push({
                    display: `${fragment}/`,
                    url: lastFragment,
                    isPartition: false,
                })
            }

            return currSlices;
        }
    }
}