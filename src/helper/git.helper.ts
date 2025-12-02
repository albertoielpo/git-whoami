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
    private readonly sg: SimpleGit; // SimpleGit instance
    constructor(options: Partial<SimpleGitOptions>) {
        this.sg = simpleGit(options);
    }

    /**
     * Retrieves the current Git author from the repository configuration
     * @returns The current commit author information
     */
    public async getCurrentAuthor(): Promise<CommitAuthor> {
        const listConfig = await this.sg.listConfig();
        const current = listConfig.all;
        const name = (current["user.name"] as string) ?? "N/A";
        const email = (current["user.email"] as string) ?? "N/A";
        const sk = current["user.signingkey"] as string;
        const res: CommitAuthor = { name, email };
        if (sk) {
            res.privateKeyPath = sk;
        }

        return res;
    }

    /**
     * Retrieves all available authors from Git configuration files
     * @returns A map of all configured authors indexed by email
     */
    public async getAllAvailableAuthors(): Promise<GlobalStateAuthorDetailsType> {
        const commitAuthors: GlobalStateAuthorDetailsType = {};
        const listConfig = await this.sg.listConfig();
        const allFiles = Object.keys(listConfig.values); // All configuration files
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
     * Unsets a Git configuration value using the raw API
     * @param key - The configuration key to unset
     * @param scope - The configuration scope (local, global, or system)
     * @param value - Optional specific value to unset
     * @param allValues - Whether to unset all matching values (default: false)
     */
    private async unsetConfig(
        key: string,
        scope: GitConfigScope,
        value?: string,
        allValues = false
    ): Promise<void> {
        // Build command: git config [--local|--global|--system] --unset[-all] key [value]
        const scopeFlag = `--${scope}`;
        const unsetFlag = allValues ? "--unset-all" : "--unset";
        const args = ["config", scopeFlag, unsetFlag, key];
        if (value) {
            args.push(value);
        }
        await this.sg.raw(args);
    }

    /**
     * Saves author data to Git configuration
     * @param data - The commit author data to save
     * @param scope - The configuration scope (defaults to local)
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
            // Set private key parameters
            await this.sg.addConfig(
                "user.signingkey",
                data.privateKeyPath,
                false,
                curScope
            );
            await this.sg.addConfig("gpg.format", "ssh", false, curScope);
            await this.sg.addConfig("commit.gpgsign", "true", false, curScope);
        } else {
            // Unset private key parameters
            await this.unsetConfig("user.signingkey", curScope);
            await this.unsetConfig("gpg.format", curScope, "ssh");
            await this.unsetConfig("commit.gpgsign", curScope, "true");
        }
    }
}
