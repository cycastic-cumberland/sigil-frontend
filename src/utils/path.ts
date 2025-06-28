export const extractAndEncodePathFragments = (dir: string): { display: string, url: string }[] => {
    const split = dir.split('/').filter(s => s);
    switch (split.length){
        case 0:{
            return [{ display: '/', url: '/' }]
        }
        default: {
            const currSlices = [{ display: '/', url: '/' }]
            let lastFragment = '/'
            for (const fragment of split) {
                lastFragment = `${lastFragment}${encodeURIComponent(fragment)}/`
                currSlices.push({
                    display: `${fragment}/`,
                    url: lastFragment
                })
            }

            return currSlices;
        }
    }
}