import { ExtensionContext } from "vscode";
import { GLOBAL_STATE_AUTHOR_DETAILS } from "../const";

export default class GlobalState {
    private readonly context: ExtensionContext;

    constructor(context: ExtensionContext) {
        this.context = context;
    }

    async getAuthorDetails(): Promise<Record<string, string> | undefined> {
        return this.context.globalState.get(GLOBAL_STATE_AUTHOR_DETAILS);
    }

    async updateAuthorDetails(data: object): Promise<unknown> {
        const savedConfig = await this.getAuthorDetails();
        return this.context.globalState.update(GLOBAL_STATE_AUTHOR_DETAILS, {
            ...(savedConfig ?? {}),
            ...data
        });
    }
}
