import { lstat } from "node:fs/promises";
import { ExtensionContext, commands, workspace } from "vscode";
import {
    COMMAND_CHANGE_AUTHOR,
    COMMAND_CLEAN_AUTHORS,
    COMMAND_DELETE_AUTHOR
} from "./const";
import AuthorStatusBar from "./context/author-status-bar.context";
import GlobalState from "./context/global-state.context";
import GitHelper from "./helper/git.helper";

/**
 * On load
 * @param context
 * @param authorStatusBar
 */
async function onExtensionLoad(
    authorStatusBar: AuthorStatusBar,
    globalState: GlobalState,
    gitHelper: GitHelper
) {
    try {
        const author = await gitHelper.getCurrentAuthor();
        const currentConfig = await gitHelper.getAllAvailableAuthors();
        await globalState.updateAuthorDetails(currentConfig);
        authorStatusBar.set(author);
    } catch (error) {
        console.error(error);
    }
}

/**
 * It checks if the project is a git project using file system api
 * @returns
 */
async function isGitProject(): Promise<string | undefined> {
    try {
        if (workspace.workspaceFolders?.length) {
            const workspacePath = workspace.workspaceFolders[0].uri.fsPath;
            const isGitProject = await lstat(`${workspacePath}/.git`);
            if (!isGitProject.isDirectory()) {
                return;
            }
            return workspacePath;
        }
    } catch (error) {
        return;
    }
}

/**
 * On extension activation
 * @param context
 */
export async function activate(context: ExtensionContext) {
    const workspacePath = await isGitProject();
    if (!workspacePath) {
        console.error("This is not a git project");
        return;
    }

    const gitHelper = new GitHelper({
        baseDir: workspacePath,
        binary: "git"
    });

    const config = workspace.getConfiguration("git-whoami");
    const statusbarDisplay = config.statusbar?.display ?? "full";

    const authorStatusBar = new AuthorStatusBar(gitHelper, statusbarDisplay);
    const globalState = new GlobalState(context);

    // register command "change author"
    const changeAuthor = commands.registerCommand(COMMAND_CHANGE_AUTHOR, () =>
        authorStatusBar.onClick(globalState)
    );

    // register command "set default author"
    context.subscriptions.push(changeAuthor);

    const cleanAuthors = commands.registerCommand(COMMAND_CLEAN_AUTHORS, () =>
        authorStatusBar.cleanAuthors(globalState)
    );
    context.subscriptions.push(cleanAuthors);

    const deleteAuthor = commands.registerCommand(COMMAND_DELETE_AUTHOR, () =>
        authorStatusBar.deleteAuthor(globalState)
    );
    context.subscriptions.push(deleteAuthor);

    onExtensionLoad(authorStatusBar, globalState, gitHelper);
}

export function deactivate() {}
