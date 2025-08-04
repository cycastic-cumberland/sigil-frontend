import {useLocation} from "react-router";
import {useMemo} from "react";
import psl, {type ParsedDomain} from 'psl';

export type ListingPathFragment = {
    display: string,
    url: string,
    isPartition: boolean,
}

export const useQuery = () => {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search), [search]);
}

export const encodedListingPath = (path: string): string => {
    return path.split("/").filter(s => s).map(encodeURIComponent).join("/")
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
                    lastFragment = s.url

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

export const getRpIdFromUrl = (urlString: string) => {
    const { hostname } = new URL(urlString);
    const { domain } = psl.parse(hostname) as ParsedDomain;
    return domain || hostname;
}

