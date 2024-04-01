import { homedir } from "os";
import { Config, promise as parseGitConfig } from "parse-git-config";
import * as vscode from "vscode";

const gitAuthorDetails: Record<string, string> = {};
const GIT_AUTHOR_DETAILS = "gitAuthorDetails";

/**
 * init code execution
 * @param context
 */
async function init(context: vscode.ExtensionContext) {
    try {
        let tmp = vscode.workspace?.workspaceFolders;
        let workspacePath = "";
        if (Array.isArray(tmp) && tmp.length >= 0) {
            workspacePath = tmp[0].uri.path;
        }
        console.log(workspacePath);
        const gitconfigs = await Promise.allSettled([
            parseGitConfig({ cwd: homedir(), path: ".gitconfig" }), // home user settings
            parseGitConfig({ cwd: workspacePath, path: ".git/config" }) // workspace sttings
        ]);

        const x = gitconfigs
            .filter((x) => x.status === "fulfilled")
            .map((y) => {
                const cur = (<Config>y).value;
                if (cur && cur.user) {
                    gitAuthorDetails[cur.user.email] =
                        cur.user.name ?? "inherit from parent";
                    return cur.user;
                }
                return {};
            });

        // update some property to global state
        await context.globalState.update(GIT_AUTHOR_DETAILS, gitAuthorDetails);

        const user = { ...x[0], ...x[1] };
        vscode.window.showInformationMessage(
            `Git user ${user.email} ${user.name}`
        );

        const sbItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            1
        );
        sbItem.text = user.email;
        sbItem.tooltip = `${user.name} <${user.email}>`;
        // sbItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        sbItem.command = "git-whoami.change-author"; // on click on tooltip change author
        sbItem.show();
    } catch (error) {
        console.log("file does not exists");
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
            vscode.window.showInformationMessage(`Got: ${result}`);
            // TODO: on select update workspace configuration
        }
    );

    context.subscriptions.push(showCurrentAuthor);
    context.subscriptions.push(changeAuthor);

    init(context)
        .then()
        .catch((err) => console.error(err));
}

export function deactivate() {}
