
<div align="center">
  <img src="./images/icon.png" alt="CleanX Icon" width="128" height="128">
  <h1>CleanX</h1>
</div>

A VS Code extension that helps you manage tabs efficiently with Git diff cleanup, tab sorting, and workspace management features.

## Features

- **One-click Git cleanup**: Close all Git diff editors (Working Tree and Index editors) at once
- **Tab workspaces**: Save and load named collections of open tabs
- **Tab sorting**: Sort tabs by file type (with custom order) and then alphabetically (opt-in)
- **Smart detection**: Automatically identifies Working Tree and Index editors using multiple detection methods
- **Status bar indicators**: Shows Git diff count and current workspace name
- **Configurable**: All features can be enabled/disabled via settings

## How to Use

### Close Git Diff Editors
1. Install the extension
2. Look for the clear button (🗑️) in the Open Editors panel title bar
3. Click to close all Git diff editors at once

### Tab Workspaces
1. Enable workspace buttons: `cleanx.showWorkspaceButtons: true`
2. **Save**: Click save button (💾) to create a named workspace from current tabs
3. **Load/Manage**: Click workspaces button (📂) to load, create, delete, or rename workspaces
4. **Status bar**: Shows current workspace name when active

### Sort Tabs (Optional)
1. Enable the sort button: `cleanx.showSortButton: true`
2. Click sort button (↕️) to organize tabs by file type and name
3. Customize order with `cleanx.customFileTypeOrder` setting

All features are accessible via Command Palette with "CleanX:" prefix.

## Extension Settings

This extension contributes the following settings:

### Tab Workspace Settings
* `cleanx.showWorkspaceButtons`: Show tab workspace buttons (save/load) in the Open Editors panel (default: `false`)

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

* `CleanX: Close Git Diff Editors`: Close all Git diff editors at once
* `CleanX: Sort Tabs`: Sort tabs by file type and alphabetically  
* `CleanX: Save Tab Workspace`: Save current tabs as a named workspace
* `CleanX: Tab Workspaces`: Manage tab workspaces (load, create, delete, rename)

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
