import { GitConfigScope, SimpleGitOptions, simpleGit } from "simple-git";

export type CommitAuthor = {
    name?: string;
    email?: string;
};

export default class GitHelper {
    private readonly sg;
    constructor(options: Partial<SimpleGitOptions>) {
        this.sg = simpleGit(options);
    }

    public async getCurrentAuthor(): Promise<CommitAuthor> {
        const listConfig = await this.sg.listConfig();
        const current = listConfig.all;
        const name = (current["user.name"] as string) ?? "N/A";
        const email = (current["user.email"] as string) ?? "N/A";
        return { name, email };
    }

    public async getAllAvailableAuthors(): Promise<Record<string, string>> {
        const commitAuthors: Record<string, string> = {};
        const listConfig = await this.sg.listConfig();
        const allFiles = Object.keys(listConfig.values); // all files
        for (const f of allFiles) {
            const conf = listConfig.values[f];
            const name = conf["user.name"] as string | undefined;
            const email = conf["user.email"] as string | undefined;
            if (name && email) {
                commitAuthors[email] = name;
            }
        }
        return commitAuthors;
    }

    public async save(data: CommitAuthor, scope?: GitConfigScope) {
        if (!data) {
            return;
        }
        if (data.email) {
            await this.sg.addConfig(
                "user.email",
                data.email,
                false,
                scope ?? "local"
            );
        }
        if (data.name) {
            await this.sg.addConfig(
                "user.name",
                data.name,
                false,
                scope ?? "local"
            );
        }
    }
}
