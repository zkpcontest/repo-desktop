/**
 * Cut string with delimiter
 * @param data
 * @param start
 * @param end
 * @param delimiter
 */
export const shortenString = (data: string, start: number = 7, end: number = 7, delimiter: string = '...'): string => {
    const left = data.substring(0, start);
    const right = data.substring(data.length - end);
    return `${left}${delimiter}${right}`;
}
