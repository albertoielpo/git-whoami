# Git whoami

Git whoami vscode extension give the possibility to display in the status bar the author which be used for a commit.

Under the hood are used git user.name and git user.email properties

## Marketplace - Visual studio

<a href="https://marketplace.visualstudio.com/items?itemName=AlbertoIelpo.git-whoami"> Git whoami </a>

Launch VS Code Quick Open (Ctrl+P), paste the following command, and press enter
<code>ext install AlbertoIelpo.git-whoami</code>

## Features

-   display current author name <author email> in the status bar
-   change author name and patch at local level (.git/config)
-   insert new author name
-   personalize info to display via property (only name, only email, both)
-   add support for ssh signing key

## How to use

-   Click on the status bar on the author name and select/add the author name
-   CTRL+MAIUSC+P + "Git Whoami: change author" and select/add the author name
-   CTRL+MAIUSC+P + "Git Whoami: clean authors except current" to delete cache layer

## Configuration

Git Whoami status bar display can be:

-   full (author name \<author email\>)
-   email (author email)
-   name (author name)
-   domain (author email domain only)

### Example

-   <code>git-whoami.statusbar.display: "full" | "email" | "name" | "domain" </code>

## Publish into marketplace

Complete requirement guide

-   https://code.visualstudio.com/api/working-with-extensions/publishing-extension

then <code> npm run publish </code>
