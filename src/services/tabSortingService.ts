import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Service responsible for sorting tabs by file type and alphabetically
 */
export class TabSortingService {

    /**
     * Sort all open tabs by file type (using custom order if provided) and then alphabetically
     * Simple approach: close all tabs and reopen in sorted order
     * @param customFileTypeOrder Custom order for file extensions
     */
    public async sortTabs(customFileTypeOrder: string[] = []): Promise<number> {
        const allTabs = this.getAllTabs();
        
        if (allTabs.length <= 1) {
            return 0; // No need to sort if 0 or 1 tabs
        }

        // Store all tab information
        const allTabInfos: Array<{
            uri?: vscode.Uri;
            originalUri?: vscode.Uri;
            modifiedUri?: vscode.Uri;
            viewType?: string;
            isActive: boolean;
            isPinned: boolean;
            label: string;
            viewColumn: vscode.ViewColumn;
        }> = [];

        let activeTabInfo: typeof allTabInfos[0] | undefined;

        // Collect information from all tabs
        for (const tab of allTabs) {
            const tabInfo: typeof allTabInfos[0] = {
                isActive: tab.isActive,
                isPinned: tab.isPinned,
                label: tab.label,
                viewColumn: tab.group.viewColumn
            };

            if (tab.isActive) {
                activeTabInfo = tabInfo;
            }

            if (tab.input instanceof vscode.TabInputText) {
                tabInfo.uri = tab.input.uri;
            } else if (tab.input instanceof vscode.TabInputTextDiff) {
                tabInfo.originalUri = tab.input.original;
                tabInfo.modifiedUri = tab.input.modified;
            } else if (tab.input instanceof vscode.TabInputCustom) {
                tabInfo.uri = tab.input.uri;
                tabInfo.viewType = tab.input.viewType;
            }

            allTabInfos.push(tabInfo);
        }

        // Sort all tabs
        const sortedTabInfos = this.sortTabInfoArray(allTabInfos, customFileTypeOrder);

        // Close all tabs
        try {
            await vscode.window.tabGroups.close(allTabs, true);
            // Wait for all tabs to close
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.warn('Failed to close all tabs:', error);
            return 0;
        }

        // Reopen all tabs in sorted order
        let reopenedCount = 0;
        for (const tabInfo of sortedTabInfos) {
            try {
                if (tabInfo.uri && !tabInfo.originalUri) {
                    // Regular text file
                    const document = await vscode.workspace.openTextDocument(tabInfo.uri);
                    await vscode.window.showTextDocument(document, {
                        viewColumn: tabInfo.viewColumn,
                        preview: !tabInfo.isPinned,
                        preserveFocus: true
                    });
                    reopenedCount++;
                } else if (tabInfo.originalUri && tabInfo.modifiedUri) {
                    // Diff editor
                    await vscode.commands.executeCommand('vscode.diff',
                        tabInfo.originalUri,
                        tabInfo.modifiedUri,
                        tabInfo.label,
                        {
                            viewColumn: tabInfo.viewColumn,
                            preview: !tabInfo.isPinned
                        }
                    );
                    reopenedCount++;
                }
                
                // Small delay between tabs
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
                console.warn(`Failed to reopen tab: ${tabInfo.label}`, error);
            }
        }

        // Restore focus to originally active tab if possible
        if (activeTabInfo?.uri) {
            try {
                const document = await vscode.workspace.openTextDocument(activeTabInfo.uri);
                await vscode.window.showTextDocument(document, {
                    viewColumn: activeTabInfo.viewColumn,
                    preserveFocus: false
                });
            } catch (error) {
                console.warn('Failed to restore active tab focus:', error);
            }
        }

        return reopenedCount;
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
     * Sort an array of tab info objects by file type and alphabetically
     */
    private sortTabInfoArray(tabInfos: Array<{
        uri?: vscode.Uri;
        originalUri?: vscode.Uri;
        modifiedUri?: vscode.Uri;
        viewType?: string;
        isActive: boolean;
        isPinned: boolean;
        label: string;
        viewColumn: vscode.ViewColumn;
    }>, customFileTypeOrder: string[]): typeof tabInfos {
        return tabInfos.slice().sort((a, b) => {
            const aExt = this.getFileExtensionFromTabInfo(a);
            const bExt = this.getFileExtensionFromTabInfo(b);
            const aFileName = this.getFileNameFromTabInfo(a);
            const bFileName = this.getFileNameFromTabInfo(b);

            // If we have a custom order, use it
            if (customFileTypeOrder.length > 0) {
                const aIndex = customFileTypeOrder.indexOf(aExt);
                const bIndex = customFileTypeOrder.indexOf(bExt);
                
                // If both extensions are in the custom order
                if (aIndex !== -1 && bIndex !== -1) {
                    if (aIndex !== bIndex) {
                        return aIndex - bIndex;
                    }
                    // Same extension priority, sort alphabetically by filename
                    return aFileName.localeCompare(bFileName);
                }
                
                // If only one is in the custom order, prioritize it
                if (aIndex !== -1) {
                    return -1;
                }
                if (bIndex !== -1) {
                    return 1;
                }
                
                // Neither in custom order, fall through to default sorting
            }

            // Default sorting: first by extension, then by filename
            if (aExt !== bExt) {
                return aExt.localeCompare(bExt);
            }
            
            return aFileName.localeCompare(bFileName);
        });
    }

    /**
     * Sort an array of tabs by file type and alphabetically
     */
    private sortTabsArray(tabs: vscode.Tab[], customFileTypeOrder: string[]): vscode.Tab[] {
        return tabs.slice().sort((a, b) => {
            const aExt = this.getFileExtension(a);
            const bExt = this.getFileExtension(b);
            const aFileName = this.getFileName(a);
            const bFileName = this.getFileName(b);

            // If we have a custom order, use it
            if (customFileTypeOrder.length > 0) {
                const aIndex = customFileTypeOrder.indexOf(aExt);
                const bIndex = customFileTypeOrder.indexOf(bExt);
                
                // If both extensions are in the custom order
                if (aIndex !== -1 && bIndex !== -1) {
                    if (aIndex !== bIndex) {
                        return aIndex - bIndex;
                    }
                    // Same extension priority, sort alphabetically by filename
                    return aFileName.localeCompare(bFileName);
                }
                
                // If only one is in the custom order, prioritize it
                if (aIndex !== -1) {
                    return -1;
                }
                if (bIndex !== -1) {
                    return 1;
                }
                
                // Neither in custom order, fall through to default sorting
            }

            // Default sorting: first by extension, then by filename
            if (aExt !== bExt) {
                return aExt.localeCompare(bExt);
            }
            
            return aFileName.localeCompare(bFileName);
        });
    }

    /**
     * Get file extension from a tab
     */
    private getFileExtension(tab: vscode.Tab): string {
        let filePath = '';
        
        if (tab.input instanceof vscode.TabInputText) {
            filePath = tab.input.uri.fsPath;
        } else if (tab.input instanceof vscode.TabInputTextDiff) {
            filePath = tab.input.modified.fsPath;
        } else {
            // For other tab types, try to extract from label
            filePath = tab.label;
        }
        
        const ext = path.extname(filePath);
        return ext.startsWith('.') ? ext.substring(1).toLowerCase() : '';
    }

    /**
     * Get filename from a tab
     */
    private getFileName(tab: vscode.Tab): string {
        let filePath = '';
        
        if (tab.input instanceof vscode.TabInputText) {
            filePath = tab.input.uri.fsPath;
        } else if (tab.input instanceof vscode.TabInputTextDiff) {
            filePath = tab.input.modified.fsPath;
        } else {
            // For other tab types, use label
            return tab.label.toLowerCase();
        }
        
        return path.basename(filePath).toLowerCase();
    }

    /**
     * Get file extension from tab info
     */
    private getFileExtensionFromTabInfo(tabInfo: {
        uri?: vscode.Uri;
        originalUri?: vscode.Uri;
        modifiedUri?: vscode.Uri;
        label: string;
    }): string {
        let filePath = '';
        
        if (tabInfo.uri && !tabInfo.originalUri) {
            filePath = tabInfo.uri.fsPath;
        } else if (tabInfo.modifiedUri) {
            filePath = tabInfo.modifiedUri.fsPath;
        } else {
            filePath = tabInfo.label;
        }
        
        const ext = path.extname(filePath);
        return ext.startsWith('.') ? ext.substring(1).toLowerCase() : '';
    }

    /**
     * Get filename from tab info
     */
    private getFileNameFromTabInfo(tabInfo: {
        uri?: vscode.Uri;
        originalUri?: vscode.Uri;
        modifiedUri?: vscode.Uri;
        label: string;
    }): string {
        let filePath = '';
        
        if (tabInfo.uri && !tabInfo.originalUri) {
            filePath = tabInfo.uri.fsPath;
        } else if (tabInfo.modifiedUri) {
            filePath = tabInfo.modifiedUri.fsPath;
        } else {
            return tabInfo.label.toLowerCase();
        }
        
        return path.basename(filePath).toLowerCase();
    }



    /**
     * Get statistics about current tab organization
     */
    public getTabStatistics(): { totalTabs: number; tabsByExtension: Map<string, number> } {
        const allTabs = this.getAllTabs();
        const tabsByExtension = new Map<string, number>();
        
        for (const tab of allTabs) {
            const ext = this.getFileExtension(tab) || 'no-extension';
            tabsByExtension.set(ext, (tabsByExtension.get(ext) || 0) + 1);
        }
        
        return {
            totalTabs: allTabs.length,
            tabsByExtension
        };
    }
}