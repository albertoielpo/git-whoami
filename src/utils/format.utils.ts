import { StatusBarDisplay } from "../context/author-status-bar.context";
import { CommitAuthor } from "../helper/git.helper";

export default class FormatUtils {
    public static decode(data: string): Pick<CommitAuthor, "name" | "email"> {
        try {
            const parts = data.split("<");
            return {
                name: parts[0].trim(),
                email: parts[1].split(">")[0].trim()
            };
        } catch (error) {
            return {
                name: "N/A",
                email: "N/A"
            };
        }
    }

    public static statusBar(data: CommitAuthor, display: StatusBarDisplay) {
        switch (display) {
            case "name":
                return data.name ?? "N/A";
            case "email":
                return data.email ?? "N/A";
            case "domain":
                return data.email?.split("@")[1] ?? "N/A";
            case "full":
            default:
                return `${data.name} <${data.email}>`;
        }
    }
}
