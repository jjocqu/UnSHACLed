/**
 * Takes care of (de)serialization.
 */
export interface Parser {
    /**
     * Serialize some internal format.
     * @param data
     * @param {string} mime
     * @param {(result: any) => void} andThen
     */
    serialize(data: any, mime: string | undefined, andThen: (result: any) => void): void;

    /**
     * Parse some form of encoded content.
     * @param {string} content
     * @param {string} mime
     * @param {(result: string) => void} andThen
     */
    parse(content: string, mime: string | undefined, andThen: (result: string) => void): void;

    /**
     * Retrieve the data contained by this Parser.
     */
    getData(): any;

    /**
     * Clean whatever is contained by this Parser.
     */
    clean(): void;
}