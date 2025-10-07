import * as vscode from 'vscode';
import { GitDiffEditorService } from '../services/gitDiffEditorService';
import { ConfigurationManager } from '../utils/configurationManager';
import { Logger } from '../utils/logger';

/**
 * Command handler for closing Git diff editors (Working Tree and Index editors)
 */
export class CloseGitDiffEditorsCommand {
    private static readonly COMMAND_ID = 'cleanx.closeGitDiffEditors';

    constructor(private readonly gitDiffService: GitDiffEditorService) {}

    /**
     * Register the command with VS Code
     */
    public register(context: vscode.ExtensionContext): void {
        console.log(`🔧 CleanX: Registering command: ${CloseGitDiffEditorsCommand.COMMAND_ID}`);
        
        const disposable = vscode.commands.registerCommand(
            CloseGitDiffEditorsCommand.COMMAND_ID,
            this.execute.bind(this)
        );
        
        context.subscriptions.push(disposable);
        
        console.log('✅ CleanX: CloseGitDiffEditorsCommand registered successfully');
        // vscode.window.showInformationMessage(`Command registered: ${CloseGitDiffEditorsCommand.COMMAND_ID}`);
    }

    /**
     * Execute the command to close all Git diff editors
     */
    private async execute(): Promise<void> {
        try {
            const config = ConfigurationManager.getConfig();
            
            // Check if we should confirm before closing
            if (config.confirmBeforeClosing) {
                const gitDiffCount = this.gitDiffService.getGitDiffEditorCount();
                if (gitDiffCount === 0) {
                    if (config.showNotifications) {
                        vscode.window.showInformationMessage('No Git-related editors found to close');
                    }
                    return;
                }

                const result = await vscode.window.showWarningMessage(
                    `Close ${gitDiffCount} Git-related editor${gitDiffCount === 1 ? '' : 's'}?`,
                    { modal: true },
                    'Yes',
                    'No'
                );

                if (result !== 'Yes') {
                    return;
                }
            }

            const closedCount = await this.gitDiffService.closeAllGitDiffEditors();
            
            if (config.showNotifications) {
                if (closedCount > 0) {
                    vscode.window.showInformationMessage(
                        `Closed ${closedCount} Git-related editor${closedCount === 1 ? '' : 's'}`
                    );
                } else {
                    vscode.window.showInformationMessage('No Git-related editors found to close');
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('Failed to close Git diff editors', error);
            vscode.window.showErrorMessage(`Failed to close Git diff editors: ${errorMessage}`);
        }
    }
}