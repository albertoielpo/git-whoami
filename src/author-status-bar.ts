import * as vscode from "vscode";
import { COMMAND_CHANGE_AUTHOR, GLOBAL_STATE_AUTHOR_DETAILS } from "./const";
import GitUtils, { CommitAuthor } from "./git-utils";
export default class AuthorStatusBar {
    private readonly statusBar: vscode.StatusBarItem;
    private readonly context: vscode.ExtensionContext;
    constructor(context: vscode.ExtensionContext) {
        this.statusBar = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            1
        );
        this.context = context;
    }

    get(): vscode.StatusBarItem {
        return this.statusBar;
    }

    set(data: CommitAuthor) {
        if (!data || !data.email || !data.name) {
            return;
        }
        this.statusBar.text = `${data.name} <${data.email}>`;
        this.statusBar.tooltip = `${data.name} <${data.email}>`;
        // sbItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
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

    async onClick() {
        const gad: Record<string, string> | undefined =
            await this.context.globalState.get(GLOBAL_STATE_AUTHOR_DETAILS);
        const ADD_NEW = "Add new";
        const options = [ADD_NEW];
        for (const entry of Object.entries(gad ?? {})) {
            options.push(`${entry[1]} <${entry[0]}>`);
        }

        const result = await vscode.window.showQuickPick(options, {
            placeHolder: "Git commit authors",
            onDidSelectItem: (item) => {
                //   vscode.window.showInformationMessage(
                // `Focus ${++i}: ${item}`
                // )
            }
        });
        if (!result) {
            return;
        }

        if (result === ADD_NEW) {
            const name = await vscode.window.showInputBox({
                prompt: "insert name"
            });
            const email = await vscode.window.showInputBox({
                prompt: "insert email"
            });

            this.update({ name, email });
            await GitUtils.save({ name, email });
            return;
        }

        // vscode.window.showInformationMessage(`Got: ${result}`);
        // TODO ..
        const name = result.split("<")[0].trim();
        const email = result.split(">")[0].split("<")[1].trim();
        this.update({ name, email });

        await GitUtils.save({ name, email });
    }
}
