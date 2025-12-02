import { ExtensionContext } from "vscode";
import { GLOBAL_STATE_AUTHOR_DETAILS } from "../const";
import { CommitAuthor } from "../helper/git.helper";

export default class GlobalState {
    private readonly context: ExtensionContext;

    constructor(context: ExtensionContext) {
        this.context = context;
    }

    /**
     * Retrieves author details from the global state by email
     * @param email - The email address of the author to retrieve
     * @returns The commit author if found, null otherwise
     */
    async getAuthorByEmail(email: string): Promise<CommitAuthor | null> {
        const gs: GlobalStateAuthorDetailsSerialized | undefined =
            await this.context.globalState.get(GLOBAL_STATE_AUTHOR_DETAILS);
        const res = this.gsDeserialize(gs);
        for (const entry of Object.entries(res)) {
            if (entry[0] === email) {
                if (typeof entry[1] === "string") {
                    // Backward compatibility with version 1.0.x
                    return { name: entry[1], email: entry[0] };
                } else {
                    return entry[1];
                }
            }
        }

        return null;
    }

    /**
     * Retrieves all author details from the global state
     * @returns A map of all stored authors indexed by email
     */
    async getAuthorDetails(): Promise<GlobalStateAuthorDetailsType> {
        const gs: GlobalStateAuthorDetailsSerialized | undefined =
            await this.context.globalState.get(GLOBAL_STATE_AUTHOR_DETAILS);
        return this.gsDeserialize(gs);
    }

    /**
     * Updates author details in the global state by merging with existing data
     * @param data - The author details to merge with existing data
     * @returns A promise that resolves when the update is complete
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
     * Resets all author details in the global state
     * @returns A promise that resolves when the reset is complete
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
     * Deserializes the global state data from JSON strings to objects
     * @param gs - The serialized global state data
     * @returns The deserialized author details
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
                // Backward compatibility with version 1.0.x
                res[entry[0]] = { name: entry[1], email: entry[0] };
            }
        }
        return res;
    }

    /**
     * Serializes the global state data from objects to JSON strings
     * @param gs - The author details to serialize
     * @returns The serialized global state data
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
                // Backward compatibility with version 1.0.x
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

// In the global state context, data is stored in serialized format
export type GlobalStateAuthorDetailsSerialized = Record<string, string>;
export type GlobalStateAuthorDetailsType = Record<string, CommitAuthor>;
