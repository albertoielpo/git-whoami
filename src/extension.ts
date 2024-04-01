import { simpleGit } from "simple-git";

import * as vscode from "vscode";

const GIT_AUTHOR_DETAILS = "gitAuthorDetails";
let sbItem: vscode.StatusBarItem;

/**
 * init code execution
 * @param context
 */
async function init(context: vscode.ExtensionContext) {
    try {
        const update: Record<string, string> = {};
        const listConfig = await simpleGit().listConfig();

        const current = listConfig.all;
        const name = (current["user.name"] as string) ?? "N/A";
        const email = (current["user.email"] as string) ?? "N/A";
        update[email] = name;

        const allFiles = Object.keys(listConfig.values); // all files
        for (const f of allFiles) {
            const conf = listConfig.values[f];
            const name = conf["user.name"] as string | undefined;
            const email = conf["user.email"] as string | undefined;
            if (name && email) {
                update[email] = name;
            }
        }

        // update some property to global state
        const gad: Record<string, string> | undefined =
            await context.globalState.get(GIT_AUTHOR_DETAILS);

        await context.globalState.update(GIT_AUTHOR_DETAILS, {
            ...gad,
            ...update
        });

        // vscode.window.showInformationMessage(`Git user ${email} ${name}`);

        sbItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            1
        );
        sbItem.text = email;
        sbItem.tooltip = `${name} <${email}>`;
        // sbItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        sbItem.command = "git-whoami.change-author"; // on click on tooltip change author
        sbItem.show();
    } catch (error) {
        console.error(error);
        // TODO: manage error
    }
}

/**
 * On extension activation
 * @param context
 */
export async function activate(context: vscode.ExtensionContext) {
    const showCurrentAuthor = vscode.commands.registerCommand(
        "git-whoami.show-current-author",
        async () => {
            // when hello world is launched via command palette then execute this code
            vscode.window.showInformationMessage("show current author");
        }
    );

    const changeAuthor = vscode.commands.registerCommand(
        "git-whoami.change-author",
        async () => {
            // when hello world is launched via command palette then execute this code
            const gad: Record<string, string> | undefined =
                await context.globalState.get(GIT_AUTHOR_DETAILS);

            const options = [];
            for (const entry of Object.entries(gad ?? {})) {
                options.push(`${entry[1]} <${entry[0]}>`);
            }

            const result = await vscode.window.showQuickPick(options, {
                placeHolder: "",
                onDidSelectItem: (item) => {
                    //   vscode.window.showInformationMessage(
                    // `Focus ${++i}: ${item}`
                    // )
                }
            });
            if (!result) {
                return;
            }
            // vscode.window.showInformationMessage(`Got: ${result}`);
            // TODO ..
            const name = result.split("<")[0].trim();
            const email = result.split(">")[0].split("<")[1].trim();
            sbItem.text = email;
            sbItem.tooltip = `${name} <${email}>`;

            // patch on local
            await simpleGit().addConfig("user.email", email, false, "local");
            await simpleGit().addConfig("user.name", name, false, "local");
        }
    );

    context.subscriptions.push(showCurrentAuthor);
    context.subscriptions.push(changeAuthor);

    init(context)
        .then()
        .catch((err) => console.error(err));
}

export function deactivate() {}
