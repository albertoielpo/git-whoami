import { StatusBarAlignment, StatusBarItem, window } from "vscode";
import {
    COMMAND_CHANGE_AUTHOR,
    LABEL_ADD_NEW,
    LABEL_GIT_COMMIT_AUTHORS,
    LABEL_INSERT_EMAIL,
    LABEL_INSERT_NAME
} from "../const";
import GitHelper, { CommitAuthor } from "../helper/git.helper";
import FormatUtils from "../utils/format.utils";
import GlobalState, {
    GlobalStateAuthorDetailsType
} from "./global-state.context";

export type StatusBarDisplay = "full" | "email" | "name" | "domain";

export default class AuthorStatusBar {
    private readonly statusBar: StatusBarItem;
    private readonly gitHelper: GitHelper;
    private readonly statusBarDisplay: StatusBarDisplay;

    constructor(gitUtils: GitHelper, statusBarDisplay: StatusBarDisplay) {
        this.statusBar = window.createStatusBarItem(StatusBarAlignment.Left, 1);
        this.statusBarDisplay = statusBarDisplay;
        this.gitHelper = gitUtils;
    }

    get(): StatusBarItem {
        return this.statusBar;
    }

    set(data: CommitAuthor) {
        if (!data || !data.email || !data.name) {
            return;
        }
        this.statusBar.text = FormatUtils.statusBar(
            data,
            this.statusBarDisplay
        );
        this.statusBar.tooltip = FormatUtils.statusBar(data, "full");
        this.statusBar.command = COMMAND_CHANGE_AUTHOR; // on click on tooltip change author
        this.statusBar.show();
    }

    update(data: CommitAuthor) {
        if (!data || !data.email || !data.name) {
            return;
        }
        this.statusBar.text = FormatUtils.statusBar(
            data,
            this.statusBarDisplay
        );
        this.statusBar.tooltip = FormatUtils.statusBar(data, "full");
    }

    private async addNew(globalState: GlobalState) {
        const name = await window.showInputBox({
            prompt: LABEL_INSERT_NAME
        });
        const email = await window.showInputBox({
            prompt: LABEL_INSERT_EMAIL
        });

        const signing = await window.showInputBox({
            prompt: "Would you like to configure a signing key? y(es)/n(o)/r(eset)"
        });

        let privateKeyPath: string | undefined;

        if (
            signing?.toLowerCase() === "y" ||
            signing?.toLowerCase() === "yes"
        ) {
            // Show the native open‐file dialog
            const priKey = await window.showOpenDialog({
                canSelectMany: false,
                openLabel: "Select private key",
                filters: { "All files": ["*"] }
            });

            if (Array.isArray(priKey) && priKey.length > 0) {
                privateKeyPath = priKey[0].path;
            }
        } else if (
            signing?.toLowerCase() === "r" ||
            signing?.toLowerCase() === "reset"
        ) {
            privateKeyPath = "";
        }

        if (!name || !email) {
            return;
        }
        const author: CommitAuthor = { name, email, privateKeyPath };
        this.update(author);
        await this.gitHelper.save(author);
        await this.updateAuthorDetails(author, globalState);
    }

    async onClick(globalState: GlobalState) {
        const savedAuthorDetails = await globalState.getAuthorDetails();
        const options = [LABEL_ADD_NEW];
        for (const entry of Object.entries(savedAuthorDetails ?? {})) {
            options.push(`${entry[1].name} <${entry[0]}>`); // fullname <email>
        }

        const result = await window.showQuickPick(options, {
            placeHolder: LABEL_GIT_COMMIT_AUTHORS
            // onDidSelectItem: (item) => {}
        });
        if (!result) {
            return;
        }

        if (result === LABEL_ADD_NEW) {
            // add new user data
            await this.addNew(globalState);
            return;
        }

        const author = FormatUtils.decode(result);
        if (!author?.email) {
            return;
        }

        const cur = await globalState.getAuthorByEmail(author.email);
        this.update(cur[author.email]);
        await this.gitHelper.save(author);
        await this.updateAuthorDetails(author, globalState);
    }

    async cleanAuthors(globalState: GlobalState) {
        await globalState.resetAuthorDetails();
        const author = await this.gitHelper.getCurrentAuthor();
        await this.updateAuthorDetails(author, globalState);
    }

    private async updateAuthorDetails(
        author: CommitAuthor,
        globalState: GlobalState
    ) {
        if (!author || !author.email || !author.name) {
            return;
        }

        const tmp: GlobalStateAuthorDetailsType = {};
        tmp[author.email] = {
            name: author.name,
            privateKeyPath: author.privateKeyPath,
            email: author.email
        } as GlobalStateAuthorDetailsType;
        await globalState.updateAuthorDetails(tmp);
    }
}
