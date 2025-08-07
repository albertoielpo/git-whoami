import { homedir } from "os";
import { StatusBarAlignment, StatusBarItem, Uri, window } from "vscode";
import {
    COMMAND_CHANGE_AUTHOR,
    LABEL_ADD_NEW,
    LABEL_CONFIGURE_SIGNING_KEY,
    LABEL_DELETE_AUTHOR,
    LABEL_GIT_COMMIT_AUTHORS,
    LABEL_INSERT_EMAIL,
    LABEL_INSERT_NAME,
    LABEL_SELECT_PK
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

    /**
     * Get status bar item
     * @returns
     */
    get(): StatusBarItem {
        return this.statusBar;
    }

    /**
     * Set and show status bar item
     * @param data
     * @returns
     */
    set(data: CommitAuthor) {
        if (!data || !data.email || !data.name) {
            return;
        }
        this.statusBar.text = FormatUtils.encode(data, this.statusBarDisplay);
        this.statusBar.tooltip = FormatUtils.encode(data, "full");
        this.statusBar.command = COMMAND_CHANGE_AUTHOR; // on click on tooltip change author
        this.statusBar.show();
    }

    /**
     * Update status bar item
     * @param data
     * @returns
     */
    update(data: CommitAuthor) {
        if (!data || !data.email || !data.name) {
            return;
        }
        this.statusBar.text = FormatUtils.encode(data, this.statusBarDisplay);
        this.statusBar.tooltip = FormatUtils.encode(data, "full");
    }

    /**
     * Add new git user
     * @param globalState
     * @returns
     */
    private async addNew(globalState: GlobalState) {
        const name = await window.showInputBox({
            prompt: LABEL_INSERT_NAME
        });
        const email = await window.showInputBox({
            prompt: LABEL_INSERT_EMAIL
        });

        const signing = await window.showInputBox({
            prompt: LABEL_CONFIGURE_SIGNING_KEY
        });

        let privateKeyPath: string | undefined;

        if (
            signing?.toLowerCase() === "y" ||
            signing?.toLowerCase() === "yes"
        ) {
            const defaultUri = Uri.file(homedir()); // e.g. '/home/alberto' or 'C:\\Users\\alberto'
            // Show the native open‐file dialog
            const priKey = await window.showOpenDialog({
                canSelectMany: false,
                openLabel: LABEL_SELECT_PK,
                filters: { LABEL_ALL_FILES: ["*"] },
                defaultUri
            });

            if (Array.isArray(priKey) && priKey.length > 0) {
                privateKeyPath = priKey[0].path;
            }
        }

        if (!name || !email) {
            return;
        }
        const author: CommitAuthor = { name, email, privateKeyPath };
        this.update(author);
        await this.gitHelper.save(author);
        await this.updateAuthorDetails(author, globalState);
    }

    /**
     * Status bar item onClick action
     * @param globalState
     * @returns
     */
    async onClick(globalState: GlobalState) {
        const savedAuthorDetails = await globalState.getAuthorDetails();
        const options = [LABEL_ADD_NEW];
        for (const entry of Object.entries(savedAuthorDetails ?? {})) {
            options.push(`${entry[1].name} <${entry[0]}>`); // fullname <email>
        }

        const result = await window.showQuickPick(options, {
            placeHolder: LABEL_GIT_COMMIT_AUTHORS
        });
        if (!result) {
            return;
        }

        if (result === LABEL_ADD_NEW) {
            // add new user data
            await this.addNew(globalState);
            return;
        }

        let author = FormatUtils.decode(result);
        if (!author?.email) {
            return;
        }

        const cur = await globalState.getAuthorByEmail(author.email);
        author = cur[author.email]; // here author contains all data
        this.update(author);
        await this.gitHelper.save(author);
        await this.updateAuthorDetails(author, globalState);
    }

    /**
     * Clean all authors
     * @param globalState
     */
    async cleanAuthors(globalState: GlobalState): Promise<void> {
        await globalState.resetAuthorDetails();
        const gitAuthor = await this.gitHelper.getCurrentAuthor();
        const gsAuthor = await globalState.getAuthorByEmail(gitAuthor.email); // here author contains all data
        await this.updateAuthorDetails(gsAuthor[gitAuthor.email], globalState);
    }

    /**
     * Delete the selected author. It's not possible to delete the current one
     * @param globalState
     */
    async deleteAuthor(globalState: GlobalState): Promise<void> {
        const gitAuthor = await this.gitHelper.getCurrentAuthor();
        const savedAuthorDetails = await globalState.getAuthorDetails();
        const options = [];
        for (const entry of Object.entries(savedAuthorDetails ?? {})) {
            if (entry[0] === gitAuthor.email) {
                // skip the current one
                continue;
            }
            options.push(`${entry[1].name} <${entry[0]}>`); // fullname <email>
        }

        const result = await window.showQuickPick(options, {
            placeHolder: LABEL_DELETE_AUTHOR
        });
        if (!result) {
            return;
        }

        const selected = FormatUtils.decode(result);
        await globalState.deleteAuthorDetails(selected.email);
    }

    /**
     * Update author details
     * @param author
     * @param globalState
     * @returns
     */
    private async updateAuthorDetails(
        author: CommitAuthor,
        globalState: GlobalState
    ) {
        if (!author || !author.email || !author.name) {
            return;
        }

        const tmp: GlobalStateAuthorDetailsType = {};
        const ca: CommitAuthor = {
            name: author.name,
            privateKeyPath: author.privateKeyPath,
            email: author.email
        };
        tmp[author.email] = ca;
        await globalState.updateAuthorDetails(tmp);
    }
}
