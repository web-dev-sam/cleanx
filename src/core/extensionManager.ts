import * as vscode from 'vscode';
import { GitDiffEditorService } from '../services/gitDiffEditorService';
import { TabSortingService } from '../services/tabSortingService';
import { TabWorkspaceService } from '../services/tabWorkspaceService';
import { CloseGitDiffEditorsCommand } from '../commands/closeGitDiffEditors';
import { SortTabsCommand } from '../commands/sortTabs';
import { SaveTabWorkspaceCommand } from '../commands/saveTabWorkspace';
import { LoadTabWorkspaceCommand } from '../commands/loadTabWorkspace';
import { ConfigurationManager } from '../utils/configurationManager';
import { Logger } from '../utils/logger';

/**
 * Main extension manager that coordinates all components
 */
export class ExtensionManager {
    private gitDiffService: GitDiffEditorService;
    private sortingService: TabSortingService;
    private workspaceService: TabWorkspaceService;
    private closeCommand: CloseGitDiffEditorsCommand;
    private sortCommand: SortTabsCommand;
    private saveWorkspaceCommand: SaveTabWorkspaceCommand;
    private loadWorkspaceCommand: LoadTabWorkspaceCommand;
    private configWatcher?: vscode.Disposable;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.gitDiffService = new GitDiffEditorService();
        this.sortingService = new TabSortingService();
        this.workspaceService = new TabWorkspaceService(context);
        this.closeCommand = new CloseGitDiffEditorsCommand(this.gitDiffService);
        this.sortCommand = new SortTabsCommand(this.sortingService);
        this.saveWorkspaceCommand = new SaveTabWorkspaceCommand(this.workspaceService);
        this.loadWorkspaceCommand = new LoadTabWorkspaceCommand(this.workspaceService);
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
            this.saveWorkspaceCommand.register(this.context);
            this.loadWorkspaceCommand.register(this.context);

            // Watch for configuration changes
            this.setupConfigurationWatcher();

            // Add workspace status bar indicator
            this.setupWorkspaceStatusBarItem();
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
     * Set up status bar item showing current workspace name
     */
    private setupWorkspaceStatusBarItem(): void {
        const statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            99 // Just left of the git diff counter
        );

        statusBarItem.command = 'cleanx.loadTabWorkspace';
        statusBarItem.tooltip = 'Click to manage tab workspaces';

        // Update status bar when workspace changes
        const updateStatusBar = () => {
            const currentWorkspace = this.workspaceService.getCurrentWorkspaceName();
            if (currentWorkspace) {
                statusBarItem.text = `$(folder-active) ${currentWorkspace}`;
                statusBarItem.show();
            } else {
                statusBarItem.hide();
            }
        };

        // Watch for tab changes that might affect workspace state
        const tabChangeWatcher = vscode.window.tabGroups.onDidChangeTabs(updateStatusBar);
        const tabGroupChangeWatcher = vscode.window.tabGroups.onDidChangeTabGroups(updateStatusBar);

        // Update when workspace is loaded/saved
        // We'll update this more frequently to catch workspace changes quickly
        const workspaceUpdateInterval = setInterval(updateStatusBar, 800);

        // Initial update
        updateStatusBar();

        // Register disposables
        this.context.subscriptions.push(
            statusBarItem,
            tabChangeWatcher,
            tabGroupChangeWatcher,
            { dispose: () => clearInterval(workspaceUpdateInterval) }
        );
    }

}