import { ExtensionContext, commands } from "vscode";
import { COMMAND_CHANGE_AUTHOR } from "./const";
import AuthorStatusBar from "./context/author-status-bar";
import GlobalState from "./context/global-state";
import GitUtils from "./git-utils";

/**
 *
 * @param context
 * @param authorStatusBar
 */
async function onExtensionLoad(
    authorStatusBar: AuthorStatusBar,
    globalState: GlobalState
) {
    try {
        const { name, email } = await GitUtils.getCurrentAuthor();
        const currentConfig = await GitUtils.getAllAvailableAuthors();

        await globalState.updateAuthorDetails(currentConfig);

        authorStatusBar.set({ name, email });
    } catch (error) {
        console.error(error);
    }
}

/**
 * On extension activation
 * @param context
 */
export async function activate(context: ExtensionContext) {
    const authorStatusBar = new AuthorStatusBar(context);
    const globalState = new GlobalState(context);

    // register command "change author"
    const changeAuthor = commands.registerCommand(COMMAND_CHANGE_AUTHOR, () =>
        authorStatusBar.onClick(globalState)
    );

    context.subscriptions.push(changeAuthor);

    onExtensionLoad(authorStatusBar, globalState);
}

export function deactivate() {}
