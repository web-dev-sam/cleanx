import * as vscode from 'vscode';
import { TabWorkspace, TabWorkspaceState, TabInfo } from '../types';
import { GitignoreService } from './gitignoreService';
import { Logger } from '../utils/logger';

/**
 * Service for managing tab workspaces - saving and loading collections of open tabs
 */
export class TabWorkspaceService {
    private static readonly STATE_KEY = 'cleanx.tabWorkspaces';
    private gitignoreService: GitignoreService;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.gitignoreService = new GitignoreService();
    }

    /**
     * Get the current tab workspace state
     */
    private getState(): TabWorkspaceState {
        return this.context.globalState.get<TabWorkspaceState>(TabWorkspaceService.STATE_KEY, {
            workspaces: [],
            currentWorkspace: undefined,
            previousWorkspace: undefined
        });
    }

    /**
     * Update the tab workspace state
     */
    private async setState(state: TabWorkspaceState): Promise<void> {
        await this.context.globalState.update(TabWorkspaceService.STATE_KEY, state);
    }

    /**
     * Get all saved workspaces, sorted by last modified date
     */
    public getWorkspaces(): TabWorkspace[] {
        const state = this.getState();
        return state.workspaces
            .map(workspace => ({
                ...workspace,
                createdAt: new Date(workspace.createdAt),
                lastModified: new Date(workspace.lastModified)
            }))
            .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    }

    /**
     * Get the name of the currently active workspace
     */
    public getCurrentWorkspaceName(): string | undefined {
        return this.getState().currentWorkspace;
    }

    /**
     * Save current open tabs as a workspace
     * @param name Name for the workspace
     * @param isAutoSave Whether this is an automatic save (for previousWorkspace)
     * @returns The saved workspace
     */
    public async saveCurrentTabsAsWorkspace(name: string, isAutoSave: boolean = false): Promise<TabWorkspace> {
        try {
            // Get all currently open tabs
            const allTabs = this.getAllTabs();
            const tabInfos = this.extractTabInfos(allTabs);
            
            // Extract file paths from tabs
            let filePaths: string[] = [];
            for (const tabInfo of tabInfos) {
                if (tabInfo.uri && !tabInfo.originalUri) {
                    // Regular file tab
                    filePaths.push(tabInfo.uri.toString());
                } else if (tabInfo.modifiedUri) {
                    // Diff editor - save the modified file
                    filePaths.push(tabInfo.modifiedUri.toString());
                }
            }

            // Keep all files in workspaces (don't filter gitignored files)
            const filteredPaths = filePaths;

            const workspace: TabWorkspace = {
                name,
                tabs: filteredPaths,
                createdAt: new Date(),
                lastModified: new Date()
            };

            if (!isAutoSave) {
                // Save as a named workspace
                const state = this.getState();
                
                // Remove existing workspace with same name
                state.workspaces = state.workspaces.filter(w => w.name !== name);
                
                // Add the new workspace
                state.workspaces.push(workspace);
                state.currentWorkspace = name;
                
                await this.setState(state);
                
                Logger.info(`Saved workspace "${name}" with ${workspace.tabs.length} tabs`);
            } else {
                // Save as previous workspace (don't add to workspaces list)
                const state = this.getState();
                state.previousWorkspace = workspace;
                await this.setState(state);
                
                Logger.debug(`Auto-saved previous workspace with ${workspace.tabs.length} tabs`);
            }

            return workspace;
        } catch (error) {
            Logger.error('Failed to save tabs as workspace', error);
            throw error;
        }
    }

    /**
     * Load a workspace by name
     * @param name Name of the workspace to load
     * @param autoSaveCurrent Whether to auto-save current tabs before loading
     * @returns Object with opened and skipped counts
     */
    public async loadWorkspace(name: string, autoSaveCurrent: boolean = false): Promise<{opened: number, skipped: number}> {
        try {
            const state = this.getState();
            const workspaceData = state.workspaces.find(w => w.name === name);
            
            if (!workspaceData) {
                throw new Error(`Workspace "${name}" not found`);
            }

            // Convert dates from stored strings back to Date objects
            const workspace: TabWorkspace = {
                ...workspaceData,
                createdAt: new Date(workspaceData.createdAt),
                lastModified: new Date(workspaceData.lastModified)
            };

            // Auto-save current workspace if requested
            if (autoSaveCurrent) {
                const currentTabs = this.getAllTabs();
                if (currentTabs.length > 0) {
                    await this.saveCurrentTabsAsWorkspace(`auto-save-${Date.now()}`, true);
                }
            }

            // Close all current tabs
            const allTabs = this.getAllTabs();
            if (allTabs.length > 0) {
                await vscode.window.tabGroups.close(allTabs, true);
                // Wait for tabs to close
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Open all tabs from the workspace
            let openedCount = 0;
            let skippedCount = 0;
            for (const tabUriString of workspace.tabs) {
                try {
                    const uri = vscode.Uri.parse(tabUriString);
                    
                    if (uri.scheme === 'file') {
                        // Check if file still exists
                        try {
                            // Check if file exists
                            await vscode.workspace.fs.stat(uri);
                            
                            // Try to open the file
                            const document = await vscode.workspace.openTextDocument(uri);
                            await vscode.window.showTextDocument(document, {
                                preview: false,
                                preserveFocus: true
                            });
                            openedCount++;
                            Logger.debug(`Successfully opened: ${tabUriString}`);
                        } catch (fileError) {
                            // File doesn't exist or can't be opened
                            const errorMessage = fileError instanceof Error ? fileError.message : 'Unknown error';
                            
                            // Check if it's a binary file error
                            if (errorMessage.includes('binary') || errorMessage.includes('cannot be opened as text')) {
                                Logger.debug(`Skipped binary file: ${tabUriString}`);
                            } else {
                                Logger.error(`Failed to open file: ${tabUriString} - ${errorMessage}`, fileError);
                            }
                            skippedCount++;
                        }
                    } else {
                        // Non-file URI (might be from extensions, etc.)
                        Logger.debug(`Skipping non-file URI: ${tabUriString}`);
                        skippedCount++;
                    }
                    
                    // Small delay between opening tabs
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                    Logger.error(`Failed to process tab: ${tabUriString}`, error);
                    skippedCount++;
                }
            }

            // Update current workspace
            state.currentWorkspace = name;
            workspace.lastModified = new Date();
            await this.setState(state);

            if (skippedCount > 0) {
                Logger.info(`Loaded workspace "${name}" with ${openedCount} tabs (${skippedCount} files skipped - may be gitignored or deleted)`);
            } else {
                Logger.info(`Loaded workspace "${name}" with ${openedCount} tabs`);
            }

            return { opened: openedCount, skipped: skippedCount };
        } catch (error) {
            Logger.error(`Failed to load workspace "${name}"`, error);
            throw error;
        }
    }

    /**
     * Delete a workspace by name
     */
    public async deleteWorkspace(name: string): Promise<void> {
        try {
            const state = this.getState();
            const initialCount = state.workspaces.length;
            
            state.workspaces = state.workspaces.filter(w => w.name !== name);
            
            if (state.currentWorkspace === name) {
                state.currentWorkspace = undefined;
            }
            
            await this.setState(state);
            
            if (state.workspaces.length < initialCount) {
                Logger.info(`Deleted workspace "${name}"`);
            } else {
                throw new Error(`Workspace "${name}" not found`);
            }
        } catch (error) {
            Logger.error(`Failed to delete workspace "${name}"`, error);
            throw error;
        }
    }

    /**
     * Rename a workspace
     */
    public async renameWorkspace(oldName: string, newName: string): Promise<void> {
        try {
            const state = this.getState();
            const workspace = state.workspaces.find(w => w.name === oldName);
            
            if (!workspace) {
                throw new Error(`Workspace "${oldName}" not found`);
            }
            
            // Check if new name already exists
            if (state.workspaces.some(w => w.name === newName)) {
                throw new Error(`Workspace "${newName}" already exists`);
            }
            
            workspace.name = newName;
            workspace.lastModified = new Date();
            
            if (state.currentWorkspace === oldName) {
                state.currentWorkspace = newName;
            }
            
            await this.setState(state);
            
            Logger.info(`Renamed workspace from "${oldName}" to "${newName}"`);
        } catch (error) {
            Logger.error(`Failed to rename workspace "${oldName}" to "${newName}"`, error);
            throw error;
        }
    }

    /**
     * Get workspace by name
     */
    public getWorkspace(name: string): TabWorkspace | undefined {
        const workspace = this.getState().workspaces.find(w => w.name === name);
        if (workspace) {
            return {
                ...workspace,
                createdAt: new Date(workspace.createdAt),
                lastModified: new Date(workspace.lastModified)
            };
        }
        return undefined;
    }

    /**
     * Clear current workspace (doesn't delete, just unsets as current)
     */
    public async clearCurrentWorkspace(): Promise<void> {
        const state = this.getState();
        state.currentWorkspace = undefined;
        await this.setState(state);
    }

    /**
     * Get all open tabs across all tab groups
     */
    private getAllTabs(): vscode.Tab[] {
        const allTabs: vscode.Tab[] = [];
        
        for (const tabGroup of vscode.window.tabGroups.all) {
            allTabs.push(...tabGroup.tabs);
        }
        
        return allTabs;
    }

    /**
     * Extract tab information from VS Code tabs
     */
    private extractTabInfos(tabs: vscode.Tab[]): TabInfo[] {
        return tabs.map(tab => {
            const tabInfo: TabInfo = {
                isActive: tab.isActive,
                isPinned: tab.isPinned,
                label: tab.label,
                viewColumn: tab.group.viewColumn
            };

            if (tab.input instanceof vscode.TabInputText) {
                tabInfo.uri = tab.input.uri;
            } else if (tab.input instanceof vscode.TabInputTextDiff) {
                tabInfo.originalUri = tab.input.original;
                tabInfo.modifiedUri = tab.input.modified;
            } else if (tab.input instanceof vscode.TabInputCustom) {
                tabInfo.uri = tab.input.uri;
                tabInfo.viewType = tab.input.viewType;
            }

            return tabInfo;
        });
    }

    /**
     * Get statistics about current workspaces
     */
    public getWorkspaceStatistics(): {
        totalWorkspaces: number;
        currentWorkspace?: string;
        hasPreviousWorkspace: boolean;
    } {
        const state = this.getState();
        return {
            totalWorkspaces: state.workspaces.length,
            currentWorkspace: state.currentWorkspace,
            hasPreviousWorkspace: !!state.previousWorkspace
        };
    }

    /**
     * Restore the previous workspace (if available)
     */
    public async restorePreviousWorkspace(): Promise<void> {
        const state = this.getState();
        
        if (!state.previousWorkspace) {
            throw new Error('No previous workspace available to restore');
        }

        // Save the previous workspace as a named workspace
        const tempName = `restored-${Date.now()}`;
        state.workspaces.push({
            ...state.previousWorkspace,
            name: tempName
        });
        
        // Load it
        await this.loadWorkspace(tempName, false);
        
        // Clear the previous workspace reference
        state.previousWorkspace = undefined;
        await this.setState(state);
        
        Logger.info(`Restored previous workspace as "${tempName}"`);
    }
}