import * as vscode from 'vscode';
import { TabWorkspaceService } from '../services/tabWorkspaceService';
import { Logger } from '../utils/logger';

/**
 * Command handler for saving current tabs as a workspace
 */
export class SaveTabWorkspaceCommand {
    private static readonly COMMAND_ID = 'cleanx.saveTabWorkspace';

    constructor(private readonly workspaceService: TabWorkspaceService) {}

    /**
     * Register the command with VS Code
     */
    public register(context: vscode.ExtensionContext): void {
        console.log(`🔧 CleanX: Registering command: ${SaveTabWorkspaceCommand.COMMAND_ID}`);
        
        const disposable = vscode.commands.registerCommand(
            SaveTabWorkspaceCommand.COMMAND_ID,
            this.execute.bind(this)
        );
        
        context.subscriptions.push(disposable);
        
        console.log('✅ CleanX: SaveTabWorkspaceCommand registered successfully');
    }

    /**
     * Execute the command to save current tabs as a workspace
     */
    private async execute(): Promise<void> {
        try {
            const currentWorkspaceName = this.workspaceService.getCurrentWorkspaceName();
            
            // If there's already an active workspace, ask if user wants to update it or create new
            if (currentWorkspaceName) {
                const action = await vscode.window.showQuickPick([
                    {
                        label: `$(save) Update "${currentWorkspaceName}"`,
                        description: 'Save current tabs to the existing workspace',
                        action: 'update'
                    },
                    {
                        label: '$(add) Save as New Workspace',
                        description: 'Create a new workspace with current tabs',
                        action: 'new'
                    }
                ], {
                    placeHolder: `Current workspace: "${currentWorkspaceName}". Choose an action:`,
                    title: 'Save Tab Workspace'
                });

                if (!action) {
                    return; // User cancelled
                }

                if (action.action === 'update') {
                    await this.saveToExistingWorkspace(currentWorkspaceName);
                    return;
                }
                // Continue to create new workspace
            }

            // Prompt for workspace name
            const workspaceName = await this.promptForWorkspaceName();
            if (!workspaceName) {
                return; // User cancelled
            }

            // Check if workspace name already exists
            const existingWorkspace = this.workspaceService.getWorkspace(workspaceName);
            if (existingWorkspace) {
                const overwrite = await vscode.window.showWarningMessage(
                    `Workspace "${workspaceName}" already exists. Do you want to overwrite it?`,
                    { modal: true },
                    'Overwrite',
                    'Cancel'
                );

                if (overwrite !== 'Overwrite') {
                    return;
                }
            }

            // Save the workspace
            const workspace = await this.workspaceService.saveCurrentTabsAsWorkspace(workspaceName);
            
            vscode.window.showInformationMessage(
                `Workspace "${workspaceName}" saved with ${workspace.tabs.length} tabs`
            );

            Logger.info(`User saved workspace: ${workspaceName}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('Failed to save tab workspace', error);
            vscode.window.showErrorMessage(`Failed to save workspace: ${errorMessage}`);
        }
    }

    /**
     * Save current tabs to an existing workspace
     */
    private async saveToExistingWorkspace(workspaceName: string): Promise<void> {
        const workspace = await this.workspaceService.saveCurrentTabsAsWorkspace(workspaceName);
        
        vscode.window.showInformationMessage(
            `Updated workspace "${workspaceName}" with ${workspace.tabs.length} tabs`
        );

        Logger.info(`User updated workspace: ${workspaceName}`);
    }

    /**
     * Prompt user for workspace name with validation
     */
    private async promptForWorkspaceName(): Promise<string | undefined> {
        const name = await vscode.window.showInputBox({
            title: 'Save Tab Workspace',
            prompt: 'Enter a name for this workspace',
            placeHolder: 'e.g., "Feature Development", "Bug Fix", "Research"',
            validateInput: (value: string) => {
                const trimmed = value.trim();
                
                if (!trimmed) {
                    return 'Workspace name cannot be empty';
                }
                
                if (trimmed.length < 2) {
                    return 'Workspace name must be at least 2 characters long';
                }
                
                if (trimmed.length > 50) {
                    return 'Workspace name cannot be longer than 50 characters';
                }
                
                // Check for invalid characters
                if (!/^[a-zA-Z0-9\s\-_.]+$/.test(trimmed)) {
                    return 'Workspace name can only contain letters, numbers, spaces, hyphens, underscores, and dots';
                }
                
                return undefined; // Valid
            }
        });

        return name?.trim();
    }

    /**
     * Get suggestions for workspace names based on current context
     */
    private getWorkspaceNameSuggestions(): string[] {
        const suggestions: string[] = [];
        
        // Add suggestions based on current workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const folderName = workspaceFolders[0].name;
            suggestions.push(`${folderName} - ${new Date().toLocaleDateString()}`);
        }
        
        // Add generic suggestions
        suggestions.push(
            'Feature Development',
            'Bug Fix',
            'Research',
            'Refactoring',
            'Documentation',
            `Work Session - ${new Date().toLocaleDateString()}`
        );
        
        return suggestions;
    }
}