
<div align="center">
  <img src="./images/icon.png" alt="CleanX Icon" width="128" height="128">
  <h1>CleanX</h1>
</div>

A VS Code extension that provides a convenient button to close all Git diff editors (Working Tree and Index editors) from the Open Editors panel.

## Features

- **One-click cleanup**: Adds a button to the Open Editors panel to close all Git diff editors at once
- **Smart detection**: Automatically identifies Working Tree and Index editors using multiple detection methods
- **Tab sorting**: Optional button to sort tabs by file type (with custom order) and then alphabetically (opt-in)
- **Status bar indicator**: Shows the count of open Git diff editors in the status bar (optional)
- **Configurable notifications**: Choose whether to show notifications with how many editors closed (default: off)

## How to Use

### Close Git Diff Editors
1. Install the extension
2. Look for the close button in the Open Editors panel title bar
3. Click the button to close all diff editors

### Sort Tabs (Optional)
1. Enable the sort button in settings: `cleanx.showSortButton: true`
2. Look for the sort button (↕️ icon) in the Open Editors panel title bar
3. Click to sort tabs by file type and then alphabetically
4. Customize file type order with `cleanx.customFileTypeOrder` setting

Configure other settings as needed in VS Code settings

## Extension Settings

This extension contributes the following settings:

### General Settings
* `cleanx.showNotifications`: Show notification messages when closing Git diff editors (default: `false`)
* `cleanx.confirmBeforeClosing`: Show confirmation dialog before closing Git diff editors (default: `false`)

### Sorting Settings
* `cleanx.showSortButton`: Show the sort tabs button in the Open Editors panel (default: `false`)
* `cleanx.customFileTypeOrder`: Custom order for file extensions when sorting (default: `[]`)
  - Example: `["ts", "js", "html", "css", "json", "md"]`
  - Secondarily, sorts alphabetically by extension
* `cleanx.sortAfterClosing`: Sort remaining tabs (default: `false`)

## Commands

* `cleanx.closeGitDiffEditors`: Close all Git diff editors (can be accessed via Command Palette)
* `cleanx.sortTabs`: Sort tabs by file type and then alphabetically (can be accessed via Command Palette)

## What Gets Closed

The extension intelligently identifies and closes:

- Working Tree diff editors
- Index diff editors  
- Git diff editors from various SCM providers
- Editors with Git-related URI schemes (`git:`, `vscode-scm:`, etc.)
- Editors with Git-related labels (containing "Working Tree", "Index", diff symbols)

### Getting Started

1. Clone this repository
2. Run `pnpm install`
4. Press F5 to launch extension development host

## Contributing

Pull requests are welcome!
