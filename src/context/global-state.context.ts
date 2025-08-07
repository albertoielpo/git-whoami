import { ExtensionContext } from "vscode";
import { GLOBAL_STATE_AUTHOR_DETAILS } from "../const";
import { CommitAuthor } from "../helper/git.helper";

export default class GlobalState {
    private readonly context: ExtensionContext;

    constructor(context: ExtensionContext) {
        this.context = context;
    }

    /**
     * Get author details from global state context
     * @param email
     * @returns
     */
    async getAuthorByEmail(email: string): Promise<CommitAuthor | null> {
        const gs: GlobalStateAuthorDetailsSerialized | undefined =
            await this.context.globalState.get(GLOBAL_STATE_AUTHOR_DETAILS);
        const res = this.gsDeserialize(gs);
        for (const entry of Object.entries(res)) {
            if (entry[0] === email) {
                if (typeof entry[1] === "string") {
                    // backward compatibily with 1.0.x
                    return { name: entry[1], email: entry[0] };
                } else {
                    return entry[1];
                }
            }
        }

        return null;
    }

    /**
     * Get all author details from global state context
     * @returns
     */
    async getAuthorDetails(): Promise<GlobalStateAuthorDetailsType> {
        const gs: GlobalStateAuthorDetailsSerialized | undefined =
            await this.context.globalState.get(GLOBAL_STATE_AUTHOR_DETAILS);
        return this.gsDeserialize(gs);
    }

    /**
     * Update author details inside the global state context
     * @param data
     * @returns
     */
    async updateAuthorDetails(
        data: GlobalStateAuthorDetailsType
    ): Promise<unknown> {
        const savedConfig = await this.getAuthorDetails();
        const merge: GlobalStateAuthorDetailsType = {};

        for (const key in savedConfig) {
            merge[key] = { ...savedConfig[key] };
        }

        for (const key in data) {
            merge[key] = { ...(merge[key] || {}), ...data[key] };
        }

        return this.context.globalState.update(GLOBAL_STATE_AUTHOR_DETAILS, {
            ...this.gsSerialize(merge)
        });
    }

    /**
     * Reset author details inside the global state context
     * @returns
     */
    async resetAuthorDetails(): Promise<unknown> {
        return this.context.globalState.update(GLOBAL_STATE_AUTHOR_DETAILS, {});
    }

    async deleteAuthorDetails(email: string): Promise<unknown> {
        const authors = await this.getAuthorDetails();
        delete authors[email];
        return this.context.globalState.update(GLOBAL_STATE_AUTHOR_DETAILS, {
            ...this.gsSerialize(authors)
        });
    }

    /**
     * Deserialize global state context
     * @param gs
     * @returns
     */
    private gsDeserialize(
        gs: GlobalStateAuthorDetailsSerialized | undefined
    ): GlobalStateAuthorDetailsType {
        const res: GlobalStateAuthorDetailsType = {};
        if (!gs) {
            return res;
        }
        for (const entry of Object.entries(gs)) {
            try {
                res[entry[0]] = JSON.parse(entry[1]);
            } catch (error) {
                // backward compatibily with 1.0.x
                res[entry[0]] = { name: entry[1], email: entry[0] };
            }
        }
        return res;
    }

    /**
     * Serialize global state context
     * @param gs
     * @returns
     */
    private gsSerialize(
        gs: GlobalStateAuthorDetailsType | undefined
    ): GlobalStateAuthorDetailsSerialized {
        const res: GlobalStateAuthorDetailsSerialized = {};
        if (!gs) {
            return res;
        }
        for (const entry of Object.entries(gs)) {
            if (typeof entry[1] === "string") {
                // backward compatibily with 1.0.x
                res[entry[0]] = JSON.stringify({
                    name: entry[1],
                    email: entry[0]
                });
            } else {
                res[entry[0]] = JSON.stringify(entry[1]);
            }
        }
        return res;
    }
}

// in context globalState data are serialized
export type GlobalStateAuthorDetailsSerialized = Record<string, string>;
export type GlobalStateAuthorDetailsType = Record<string, CommitAuthor>;
