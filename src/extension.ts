import * as vscode from "vscode";
import AuthorStatusBar from "./author-status-bar";
import { COMMAND_CHANGE_AUTHOR, GLOBAL_STATE_AUTHOR_DETAILS } from "./const";
import GitUtils from "./git-utils";

/**
 *
 * @param context
 * @param authorStatusBar
 */
async function onExtensionLoad(
    context: vscode.ExtensionContext,
    authorStatusBar: AuthorStatusBar
) {
    try {
        const { name, email } = await GitUtils.getCurrentAuthor();
        const currentConfig = await GitUtils.getAllAvailableAuthors();

        // update some property to global state
        const savedConfig: Record<string, string> | undefined =
            await context.globalState.get(GLOBAL_STATE_AUTHOR_DETAILS);

        await context.globalState.update(GLOBAL_STATE_AUTHOR_DETAILS, {
            ...(savedConfig ?? {}),
            ...currentConfig
        });

        authorStatusBar.set({ name, email });
    } catch (error) {
        console.error(error);
    }
}

/**
 * On extension activation
 * @param context
 */
export async function activate(context: vscode.ExtensionContext) {
    const authorStatusBar = new AuthorStatusBar(context);

    // register command "change author"
    const changeAuthor = vscode.commands.registerCommand(
        COMMAND_CHANGE_AUTHOR,
        () => authorStatusBar.onClick()
    );

    context.subscriptions.push(changeAuthor);

    onExtensionLoad(context, authorStatusBar);
}

export function deactivate() {}
