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
     * Retrieves the status bar item instance
     * @returns The status bar item
     */
    get(): StatusBarItem {
        return this.statusBar;
    }

    /**
     * Sets the status bar content and displays it
     * @param data - The commit author data to display
     */
    set(data: CommitAuthor) {
        if (!data || !data.email || !data.name) {
            return;
        }
        this.statusBar.text = FormatUtils.encode(data, this.statusBarDisplay);
        this.statusBar.tooltip = FormatUtils.encode(data, "full");
        this.statusBar.command = COMMAND_CHANGE_AUTHOR; // Command to execute when clicking the status bar
        this.statusBar.show();
    }

    /**
     * Updates the status bar content without showing it
     * @param data - The commit author data to display
     */
    update(data: CommitAuthor) {
        if (!data || !data.email || !data.name) {
            return;
        }
        this.statusBar.text = FormatUtils.encode(data, this.statusBarDisplay);
        this.statusBar.tooltip = FormatUtils.encode(data, "full");
    }

    /**
     * Prompts the user to add a new Git author
     * @param globalState - The global state manager for storing author details
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
            const defaultUri = Uri.file(homedir()); // e.g. '/home/alberto' or 'C:\Users\alberto'
            // Show the native file picker dialog
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
     * Handles the click event on the status bar item
     * @param globalState - The global state manager for retrieving author details
     */
    async onClick(globalState: GlobalState) {
        const savedAuthorDetails = await globalState.getAuthorDetails();
        const options = [LABEL_ADD_NEW];
        for (const entry of Object.entries(savedAuthorDetails ?? {})) {
            options.push(`${entry[1].name} <${entry[0]}>`); // Format: Full Name <email>
        }

        const result = await window.showQuickPick(options, {
            placeHolder: LABEL_GIT_COMMIT_AUTHORS
        });
        if (!result) {
            return;
        }

        if (result === LABEL_ADD_NEW) {
            // Add a new author
            await this.addNew(globalState);
            return;
        }

        let author = FormatUtils.decode(result);
        if (!author?.email) {
            return;
        }

        const gsAuthor = await globalState.getAuthorByEmail(author.email);
        if (!gsAuthor) {
            return;
        }
        this.update(gsAuthor);
        await this.gitHelper.save(gsAuthor);
        await this.updateAuthorDetails(gsAuthor, globalState);
    }

    /**
     * Clears all stored authors from the global state
     * @param globalState - The global state manager for managing author details
     */
    async cleanAuthors(globalState: GlobalState): Promise<void> {
        await globalState.resetAuthorDetails();
        const gitAuthor = await this.gitHelper.getCurrentAuthor();
        const gsAuthor = await globalState.getAuthorByEmail(gitAuthor.email); // Author contains all data including signing key
        if (!gsAuthor) {
            return;
        }
        await this.updateAuthorDetails(gsAuthor, globalState);
    }

    /**
     * Prompts the user to delete a stored author (cannot delete the currently active author)
     * @param globalState - The global state manager for managing author details
     */
    async deleteAuthor(globalState: GlobalState): Promise<void> {
        const gitAuthor = await this.gitHelper.getCurrentAuthor();
        const savedAuthorDetails = await globalState.getAuthorDetails();
        const options = [];
        for (const entry of Object.entries(savedAuthorDetails ?? {})) {
            if (entry[0] === gitAuthor.email) {
                // Skip the currently active author
                continue;
            }
            options.push(`${entry[1].name} <${entry[0]}>`); // Format: Full Name <email>
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
     * Updates the author details in the global state
     * @param author - The commit author to update
     * @param globalState - The global state manager for storing author details
     */
    private async updateAuthorDetails(
        author: CommitAuthor,
        globalState: GlobalState
    ) {
        if (!author || !author.email || !author.name) {
            return;
        }

        const tmp: GlobalStateAuthorDetailsType = {};
        tmp[author.email] = author;
        await globalState.updateAuthorDetails(tmp);
    }
}
