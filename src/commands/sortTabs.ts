import * as vscode from 'vscode';
import { TabSortingService } from '../services/tabSortingService';
import { ConfigurationManager } from '../utils/configurationManager';
import { Logger } from '../utils/logger';

/**
 * Command handler for sorting tabs by file type and alphabetically
 */
export class SortTabsCommand {
    private static readonly COMMAND_ID = 'cleanx.sortTabs';

    constructor(private readonly sortingService: TabSortingService) {}

    /**
     * Register the command with VS Code
     */
    public register(context: vscode.ExtensionContext): void {
        const disposable = vscode.commands.registerCommand(
            SortTabsCommand.COMMAND_ID,
            this.execute.bind(this)
        );
        
        context.subscriptions.push(disposable);
    }

    /**
     * Execute the command to sort all tabs
     */
    private async execute(): Promise<void> {
        try {
            const config = ConfigurationManager.getConfig();
            
            const sortedCount = await this.sortingService.sortTabs(config.customFileTypeOrder);
            
            if (config.showNotifications) {
                if (sortedCount > 0) {
                    vscode.window.showInformationMessage(
                        `Sorted ${sortedCount} tab${sortedCount === 1 ? '' : 's'}`
                    );
                } else {
                    vscode.window.showInformationMessage('No tabs to sort or tabs already in correct order');
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('Failed to sort tabs', error);
            vscode.window.showErrorMessage(`Failed to sort tabs: ${errorMessage}`);
        }
    }
}