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
 * Called when the extension loads
 * @param authorStatusBar - The status bar instance for displaying author information
 * @param globalState - The global state manager for storing author details
 * @param gitHelper - The Git helper instance for Git operations
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

        const gsAuthor = await globalState.getAuthorByEmail(author.email);
        if (gsAuthor) {
            // If Git data differs from the extension's stored data
            if (gsAuthor.privateKeyPath && !author.privateKeyPath) {
                // Save the stored data to Git
                await gitHelper.save({ ...gsAuthor });
            }
        }

        authorStatusBar.set(author);
    } catch (error) {
        console.error(error);
    }
}

/**
 * Checks if the current workspace is a Git project using the file system API
 * @returns The workspace path if it is a Git project, undefined otherwise
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
 * Called when the extension is activated
 * @param context - The extension context provided by VS Code
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

    // Register the "change author" command
    const changeAuthor = commands.registerCommand(COMMAND_CHANGE_AUTHOR, () =>
        authorStatusBar.onClick(globalState)
    );

    // Add command to subscriptions for proper cleanup
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
