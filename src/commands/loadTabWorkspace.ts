import * as vscode from 'vscode';
import { TabWorkspaceService } from '../services/tabWorkspaceService';
import { TabWorkspace } from '../types';
import { Logger } from '../utils/logger';

/**
 * Command handler for loading a saved tab workspace
 */
export class LoadTabWorkspaceCommand {
    private static readonly COMMAND_ID = 'cleanx.loadTabWorkspace';

    constructor(private readonly workspaceService: TabWorkspaceService) {}

    /**
     * Register the command with VS Code
     */
    public register(context: vscode.ExtensionContext): void {
        console.log(`🔧 CleanX: Registering command: ${LoadTabWorkspaceCommand.COMMAND_ID}`);
        
        const disposable = vscode.commands.registerCommand(
            LoadTabWorkspaceCommand.COMMAND_ID,
            this.execute.bind(this)
        );
        
        context.subscriptions.push(disposable);
        
        console.log('✅ CleanX: LoadTabWorkspaceCommand registered successfully');
    }

    /**
     * Execute the command to load a saved workspace
     */
    private async execute(): Promise<void> {
        try {
            const workspaces = this.workspaceService.getWorkspaces();
            
            if (workspaces.length === 0) {
                vscode.window.showInformationMessage(
                    'No saved workspaces found. Save your current tabs as a workspace first.',
                    'Save Current Tabs'
                ).then(selection => {
                    if (selection === 'Save Current Tabs') {
                        vscode.commands.executeCommand('cleanx.saveTabWorkspace');
                    }
                });
                return;
            }

            // Create quick pick items
            const quickPickItems = this.createQuickPickItems(workspaces);
            
            // Add management options
            const managementItems = this.createManagementItems();
            
            const allItems = [...quickPickItems, ...managementItems];

            const selected = await vscode.window.showQuickPick(allItems, {
                placeHolder: 'Select a workspace to load',
                title: 'Load Tab Workspace',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (!selected) {
                return; // User cancelled
            }

            // Handle management actions
            if (selected.action) {
                await this.handleManagementAction(selected.action, workspaces);
                return;
            }

            // Handle workspace selection
            if (selected.workspace) {
                await this.loadSelectedWorkspace(selected.workspace);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('Failed to load tab workspace', error);
            vscode.window.showErrorMessage(`Failed to load workspace: ${errorMessage}`);
        }
    }

    /**
     * Create quick pick items for workspaces
     */
    private createQuickPickItems(workspaces: TabWorkspace[]): vscode.QuickPickItem[] {
        const currentWorkspaceName = this.workspaceService.getCurrentWorkspaceName();
        
        return workspaces
            .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime()) // Most recent first
            .map(workspace => {
                const isCurrentWorkspace = workspace.name === currentWorkspaceName;
                const icon = isCurrentWorkspace ? '$(check)' : '$(folder)';
                const label = `${icon} ${workspace.name}`;
                const description = isCurrentWorkspace ? '(Current)' : '';
                const detail = `${workspace.tabs.length} tabs • Modified: ${workspace.lastModified.toLocaleString()}`;
                
                return {
                    label,
                    description,
                    detail,
                    workspace
                };
            });
    }

    /**
     * Create management action items
     */
    private createManagementItems(): vscode.QuickPickItem[] {
        const statistics = this.workspaceService.getWorkspaceStatistics();
        const items: vscode.QuickPickItem[] = [];

        // Separator
        items.push({
            label: '',
            kind: vscode.QuickPickItemKind.Separator
        });

        // Management actions
        items.push({
            label: '$(trash) Delete Workspace',
            description: 'Remove a saved workspace permanently',
            action: 'delete'
        });

        items.push({
            label: '$(edit) Rename Workspace',
            description: 'Change the name of a workspace',
            action: 'rename'
        });

        items.push({
            label: '$(add) New Workspace',
            description: 'Create a new workspace from current tabs (without saving current)',
            action: 'new-workspace'
        });

        if (statistics.hasPreviousWorkspace) {
            items.push({
                label: '$(history) Restore Previous',
                description: 'Restore the auto-saved workspace from before last load',
                action: 'restore-previous'
            });
        }

        return items;
    }

    /**
     * Load the selected workspace
     */
    private async loadSelectedWorkspace(workspace: TabWorkspace): Promise<void> {
        const currentWorkspaceName = this.workspaceService.getCurrentWorkspaceName();
        
        // If it's already the current workspace, ask for confirmation
        if (workspace.name === currentWorkspaceName) {
            const reload = await vscode.window.showWarningMessage(
                `"${workspace.name}" is already the current workspace. Reload it?`,
                { modal: true },
                'Reload',
                'Cancel'
            );

            if (reload !== 'Reload') {
                return;
            }
        }

        // Check if there are unsaved changes
        const hasUnsavedChanges = vscode.workspace.textDocuments.some(doc => doc.isDirty);
        if (hasUnsavedChanges) {
            const proceed = await vscode.window.showWarningMessage(
                'You have unsaved changes. Loading a workspace will close all current tabs.',
                { modal: true },
                'Continue',
                'Cancel'
            );

            if (proceed !== 'Continue') {
                return;
            }
        }

        // Load the workspace (without auto-saving current state)
        const result = await this.workspaceService.loadWorkspace(workspace.name, false);
        
        // Show appropriate message based on results
        if (result.skipped > 0) {
            vscode.window.showInformationMessage(
                `Loaded workspace "${workspace.name}" with ${result.opened} tabs (${result.skipped} files skipped - likely binary files or deleted files)`
            );
        } else {
            vscode.window.showInformationMessage(
                `Loaded workspace "${workspace.name}" with ${result.opened} tabs`
            );
        }

        Logger.info(`User loaded workspace: ${workspace.name}`);
    }

    /**
     * Handle management actions (delete, rename, etc.)
     */
    private async handleManagementAction(action: string, workspaces: TabWorkspace[]): Promise<void> {
        switch (action) {
            case 'delete':
                await this.deleteWorkspace(workspaces);
                break;
            case 'rename':
                await this.renameWorkspace(workspaces);
                break;
            case 'restore-previous':
                await this.restorePreviousWorkspace();
                break;
            case 'new-workspace':
                await this.createNewWorkspace();
                break;
        }
    }

    /**
     * Delete a workspace
     */
    private async deleteWorkspace(workspaces: TabWorkspace[]): Promise<void> {
        if (workspaces.length === 0) {
            vscode.window.showInformationMessage('No workspaces to delete.');
            return;
        }

        const items = workspaces.map(workspace => ({
            label: `$(trash) ${workspace.name}`,
            description: `${workspace.tabs.length} tabs`,
            detail: `Created: ${workspace.createdAt.toLocaleString()}`,
            workspace
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a workspace to delete',
            title: 'Delete Workspace'
        });

        if (!selected) {
            return;
        }

        await this.workspaceService.deleteWorkspace(selected.workspace.name);
        vscode.window.showInformationMessage(`Deleted workspace "${selected.workspace.name}"`);
    }

    /**
     * Rename a workspace
     */
    private async renameWorkspace(workspaces: TabWorkspace[]): Promise<void> {
        if (workspaces.length === 0) {
            vscode.window.showInformationMessage('No workspaces to rename.');
            return;
        }

        const items = workspaces.map(workspace => ({
            label: `$(edit) ${workspace.name}`,
            description: `${workspace.tabs.length} tabs`,
            detail: `Created: ${workspace.createdAt.toLocaleString()}`,
            workspace
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a workspace to rename',
            title: 'Rename Workspace'
        });

        if (!selected) {
            return;
        }

        const newName = await vscode.window.showInputBox({
            title: 'Rename Workspace',
            prompt: 'Enter new name for the workspace',
            value: selected.workspace.name,
            validateInput: (value: string) => {
                const trimmed = value.trim();
                
                if (!trimmed) {
                    return 'Workspace name cannot be empty';
                }
                
                if (trimmed === selected.workspace.name) {
                    return 'New name must be different from current name';
                }
                
                if (workspaces.some(w => w.name === trimmed)) {
                    return 'A workspace with this name already exists';
                }
                
                return undefined;
            }
        });

        if (newName?.trim()) {
            await this.workspaceService.renameWorkspace(selected.workspace.name, newName.trim());
            vscode.window.showInformationMessage(
                `Renamed workspace from "${selected.workspace.name}" to "${newName.trim()}"`
            );
        }
    }

    /**
     * Restore the previous workspace
     */
    private async restorePreviousWorkspace(): Promise<void> {
        const confirm = await vscode.window.showWarningMessage(
            'Restore the auto-saved workspace from before your last workspace load?',
            { modal: true },
            'Restore',
            'Cancel'
        );

        if (confirm === 'Restore') {
            await this.workspaceService.restorePreviousWorkspace();
            vscode.window.showInformationMessage('Previous workspace restored successfully');
        }
    }

    /**
     * Create a new workspace from current tabs without saving current workspace
     */
    private async createNewWorkspace(): Promise<void> {
        // Prompt for workspace name
        const workspaceName = await vscode.window.showInputBox({
            title: 'Create New Workspace',
            prompt: 'Enter a name for the new workspace',
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

                // Check if workspace name already exists
                const existingWorkspace = this.workspaceService.getWorkspace(trimmed);
                if (existingWorkspace) {
                    return 'A workspace with this name already exists';
                }
                
                return undefined; // Valid
            }
        });

        if (!workspaceName?.trim()) {
            return; // User cancelled
        }

        try {
            // Save current tabs as new workspace (without auto-save)
            const workspace = await this.workspaceService.saveCurrentTabsAsWorkspace(workspaceName.trim(), false);
            
            vscode.window.showInformationMessage(
                `Created new workspace "${workspaceName.trim()}" with ${workspace.tabs.length} tabs`
            );

            Logger.info(`User created new workspace: ${workspaceName.trim()}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('Failed to create new workspace', error);
            vscode.window.showErrorMessage(`Failed to create workspace: ${errorMessage}`);
        }
    }
}

// Extend QuickPickItem interface to include our custom properties
declare module 'vscode' {
    interface QuickPickItem {
        workspace?: TabWorkspace;
        action?: string;
    }
}