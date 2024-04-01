import { GitConfigScope, simpleGit } from "simple-git";

export type CommitAuthor = {
    name?: string;
    email?: string;
};

export default class GitUtils {
    public static async getCurrentAuthor(): Promise<CommitAuthor> {
        const listConfig = await simpleGit().listConfig();
        const current = listConfig.all;
        const name = (current["user.name"] as string) ?? "N/A";
        const email = (current["user.email"] as string) ?? "N/A";
        return { name, email };
    }

    public static async getAllAvailableAuthors(): Promise<
        Record<string, string>
    > {
        const commitAuthors: Record<string, string> = {};
        const listConfig = await simpleGit().listConfig();
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

    public static async save(data: CommitAuthor, scope?: GitConfigScope) {
        if (!data) {
            return;
        }
        if (data.email) {
            await simpleGit().addConfig(
                "user.email",
                data.email,
                false,
                "local"
            );
        }
        if (data.name) {
            await simpleGit().addConfig(
                "user.name",
                data.name,
                false,
                scope ?? "local"
            );
        }
    }
}
