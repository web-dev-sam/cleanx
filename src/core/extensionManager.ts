import * as vscode from 'vscode';
import { GitDiffEditorService } from '../services/gitDiffEditorService';
import { TabSortingService } from '../services/tabSortingService';
import { CloseGitDiffEditorsCommand } from '../commands/closeGitDiffEditors';
import { SortTabsCommand } from '../commands/sortTabs';
import { ConfigurationManager } from '../utils/configurationManager';
import { Logger } from '../utils/logger';

/**
 * Main extension manager that coordinates all components
 */
export class ExtensionManager {
    private gitDiffService: GitDiffEditorService;
    private sortingService: TabSortingService;
    private closeCommand: CloseGitDiffEditorsCommand;
    private sortCommand: SortTabsCommand;
    private configWatcher?: vscode.Disposable;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.gitDiffService = new GitDiffEditorService();
        this.sortingService = new TabSortingService();
                this.closeCommand = new CloseGitDiffEditorsCommand(this.gitDiffService);
        this.sortCommand = new SortTabsCommand(this.sortingService);
    }

    /**
     * Initialize and activate the extension
     */
    public async activate(): Promise<void> {
        try {
            Logger.initialize('CleanX');

            // Register commands
            this.closeCommand.register(this.context);
            this.sortCommand.register(this.context);

            // Watch for configuration changes
            this.setupConfigurationWatcher();

            // Add status bar indicator (optional)
            this.setupStatusBarItem();
        } catch (error) {
            Logger.error('Failed to activate CleanX extension', error);
            throw error;
        }
    }

    /**
     * Deactivate the extension and clean up resources
     */
    public deactivate(): void {
        this.configWatcher?.dispose();
        Logger.dispose();
    }

    /**
     * Set up configuration change watcher
     */
    private setupConfigurationWatcher(): void {
        this.configWatcher = ConfigurationManager.onConfigurationChanged(() => {
            // Configuration changed - could add any needed logic here
        });

        this.context.subscriptions.push(this.configWatcher);
    }

    /**
     * Set up optional status bar item showing count of Git diff editors
     */
    private setupStatusBarItem(): void {
        const statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );

        statusBarItem.command = 'cleanx.closeGitDiffEditors';
        statusBarItem.tooltip = 'Click to close all Git diff editors';

        // Update status bar when tabs change
        const updateStatusBar = () => {
            const count = this.gitDiffService.getGitDiffEditorCount();
            if (count > 0) {
                statusBarItem.text = `$(diff) ${count}`;
                statusBarItem.show();
            } else {
                statusBarItem.hide();
            }
        };

        // Watch for tab changes
        const tabChangeWatcher = vscode.window.tabGroups.onDidChangeTabs(updateStatusBar);
        const tabGroupChangeWatcher = vscode.window.tabGroups.onDidChangeTabGroups(updateStatusBar);

        // Initial update
        updateStatusBar();

        // Register disposables
        this.context.subscriptions.push(
            statusBarItem,
            tabChangeWatcher,
            tabGroupChangeWatcher
        );
    }


}