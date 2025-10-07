
# CleanX

A VS Code extension that provides a convenient button to close all Git diff editors (Working Tree and Index editors) from the Open Editors panel.

## Features

- **One-click cleanup**: Adds a button to the Open Editors panel to close all Git diff editors at once
- **Smart detection**: Automatically identifies Working Tree and Index editors using multiple detection methods
- **Status bar indicator**: Shows the count of open Git diff editors in the status bar (optional)
- **Configurable notifications**: Choose whether to show notifications when editors are closed
- **Confirmation dialog**: Optional confirmation before closing editors
- **Clean architecture**: Well-structured, maintainable codebase following best practices

## How to Use

1. Install the extension
2. Look for the close button (X icon) in the Open Editors panel title bar
3. Click the button to close all Git diff editors
4. Configure settings as needed in VS Code settings

## Extension Settings

This extension contributes the following settings:

* `cleanx.showNotifications`: Show notification messages when closing Git diff editors (default: `true`)
* `cleanx.confirmBeforeClosing`: Show confirmation dialog before closing Git diff editors (default: `false`)

## Commands

* `cleanx.closeGitDiffEditors`: Close all Git diff editors (can be accessed via Command Palette)

## What Gets Closed

The extension intelligently identifies and closes:

- Working Tree diff editors
- Index diff editors  
- Git diff editors from various SCM providers
- Editors with Git-related URI schemes (`git:`, `vscode-scm:`, etc.)
- Editors with Git-related labels (containing "Working Tree", "Index", diff symbols)

## Requirements

- VS Code 1.103.0 or higher

## Development

This extension follows clean architecture principles:

```
src/
├── commands/           # Command handlers
├── core/              # Core extension management
├── services/          # Business logic services
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
└── extension.ts       # Main entry point
```

### Getting Started

1. Clone this repository
2. Run `pnpm install`
3. Run `pnpm run watch` to start development
4. Press F5 to launch extension development host

## Contributing

Pull requests are welcome!

