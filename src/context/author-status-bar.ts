import {
    ExtensionContext,
    StatusBarAlignment,
    StatusBarItem,
    window
} from "vscode";
import {
    COMMAND_CHANGE_AUTHOR,
    LABEL_ADD_NEW,
    LABEL_GIT_COMMIT_AUTHORS,
    LABEL_INSERT_EMAIL,
    LABEL_INSERT_NAME
} from "../const";
import GitUtils, { CommitAuthor } from "../git-utils";
import GlobalState from "./global-state";
export default class AuthorStatusBar {
    private readonly statusBar: StatusBarItem;
    private readonly context: ExtensionContext;

    constructor(context: ExtensionContext) {
        this.statusBar = window.createStatusBarItem(StatusBarAlignment.Left, 1);
        this.context = context;
    }

    get(): StatusBarItem {
        return this.statusBar;
    }

    set(data: CommitAuthor) {
        if (!data || !data.email || !data.name) {
            return;
        }
        this.statusBar.text = `${data.name} <${data.email}>`;
        this.statusBar.tooltip = `${data.name} <${data.email}>`;
        this.statusBar.command = COMMAND_CHANGE_AUTHOR; // on click on tooltip change author
        this.statusBar.show();
    }

    update(data: CommitAuthor) {
        if (!data || !data.email || !data.name) {
            return;
        }
        this.statusBar.text = `${data.name} <${data.email}>`;
        this.statusBar.tooltip = `${data.name} <${data.email}>`;
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

            this.update({ name, email });
            await GitUtils.save({ name, email });
            return;
        }

        // TODO ..
        const name = result.split("<")[0].trim();
        const email = result.split(">")[0].split("<")[1].trim();
        this.update({ name, email });

        await GitUtils.save({ name, email });
    }
}
