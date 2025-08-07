import {
    GitConfigScope,
    SimpleGit,
    SimpleGitOptions,
    simpleGit
} from "simple-git";
import { GlobalStateAuthorDetailsType } from "../context/global-state.context";

export type CommitAuthor = {
    name?: string;
    email: string;
    privateKeyPath?: string;
};

export default class GitHelper {
    private readonly sg: SimpleGit; // simple git instance
    constructor(options: Partial<SimpleGitOptions>) {
        this.sg = simpleGit(options);
    }

    /**
     * Get current author
     * @returns
     */
    public async getCurrentAuthor(): Promise<CommitAuthor> {
        const listConfig = await this.sg.listConfig();
        const current = listConfig.all;
        const name = (current["user.name"] as string) ?? "N/A";
        const email = (current["user.email"] as string) ?? "N/A";
        return { name, email };
    }

    /**
     * List configuration
     * @returns
     */
    public async getAllAvailableAuthors(): Promise<GlobalStateAuthorDetailsType> {
        const commitAuthors: GlobalStateAuthorDetailsType = {};
        const listConfig = await this.sg.listConfig();
        const allFiles = Object.keys(listConfig.values); // all files
        for (const f of allFiles) {
            const conf = listConfig.values[f];
            const name = conf["user.name"] as string | undefined;
            const email = conf["user.email"] as string | undefined;
            const privateKeyPath = conf["user.signingkey"] as
                | string
                | undefined;
            if (name && email) {
                commitAuthors[email] = {
                    name,
                    email
                } as CommitAuthor;
                if (privateKeyPath) {
                    commitAuthors[email].privateKeyPath = privateKeyPath;
                }
            }
        }
        return commitAuthors;
    }

    /**
     * Unset git configuration using raw api
     * @param key
     * @param scope
     * @param value
     * @param allValues
     */
    private async unsetConfig(
        key: string,
        scope: GitConfigScope,
        value?: string,
        allValues = false
    ): Promise<void> {
        // build: git config [--local|--global|--system] --unset[-all] key [value]
        const scopeFlag = `--${scope}`;
        const unsetFlag = allValues ? "--unset-all" : "--unset";
        const args = ["config", scopeFlag, unsetFlag, key];
        if (value) {
            args.push(value);
        }
        await this.sg.raw(args);
    }

    /**
     * Save data into git config
     * @param data
     * @param scope
     * @returns
     */
    public async save(
        data: CommitAuthor,
        scope?: GitConfigScope
    ): Promise<void> {
        if (!data) {
            return;
        }
        const curScope = scope || GitConfigScope.local;
        if (data.email) {
            await this.sg.addConfig("user.email", data.email, false, curScope);
        }
        if (data.name) {
            await this.sg.addConfig("user.name", data.name, false, curScope);
        }

        if (data.privateKeyPath) {
            // set private key params
            await this.sg.addConfig(
                "user.signingkey",
                data.privateKeyPath,
                false,
                curScope
            );
            await this.sg.addConfig("gpg.format", "ssh", false, curScope);
            await this.sg.addConfig("commit.gpgsign", "true", false, curScope);
        } else {
            // unset private key params
            await this.unsetConfig("user.signingkey", curScope);
            await this.unsetConfig("gpg.format", curScope, "ssh");
            await this.unsetConfig("commit.gpgsign", curScope, "true");
        }
    }
}
