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
import GlobalState from "./global-state.context";

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

    async onClick(globalState: GlobalState) {
        const savedAuthorDetails = await globalState.getAuthorDetails();
        const options = [LABEL_ADD_NEW];
        for (const entry of Object.entries(savedAuthorDetails ?? {})) {
            options.push(`${entry[1]} <${entry[0]}>`);
        }

        const result = await window.showQuickPick(options, {
            placeHolder: LABEL_GIT_COMMIT_AUTHORS
            // onDidSelectItem: (item) => {}
        });
        if (!result) {
            return;
        }

        if (result === LABEL_ADD_NEW) {
            const name = await window.showInputBox({
                prompt: LABEL_INSERT_NAME
            });
            const email = await window.showInputBox({
                prompt: LABEL_INSERT_EMAIL
            });

            if (!name || !email) {
                return;
            }
            const author = { name, email };
            this.update(author);
            await this.gitHelper.save(author);
            await this.updateAuthorDetails(author, globalState);
            return;
        }

        const author = FormatUtils.decode(result);
        this.update(author);
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

        const tmp: Record<string, string> = {};
        tmp[author.email] = author.name;
        await globalState.updateAuthorDetails(tmp);
    }
}
