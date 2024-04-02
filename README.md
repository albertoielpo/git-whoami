# Git whoami

Git whoami vscode extension give the possibility to display in the status bar the author which be used for a commit.

Underline are used git user.name and git user.email property

## Features

-   display current author name <author email> in the status bar
-   change author name and patch at local level (.git/config)
-   insert new author name
-   personalize info to display via property (only name, only email, both)

## How to use

-   Click on the status bar on the author name and select/add the author name
-   CTRL+MAIUSC+P + "change author" and select/add the author name
-   CTRL+MAIUSC+P + "clean authors except current" to delete cache layer

## Configuration

```
{
    git-whoami.statusbar.display: "full" | "email" | "name" | "domain"
}
```

### Example

-   full: name <email-name@domain>
-   email: email-name@domain
-   name: name
-   domain: domain
