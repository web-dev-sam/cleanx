import * as vscode from 'vscode';

/**
 * Service responsible for identifying and managing Git diff editors
 */
export class GitDiffEditorService {
    
    /**
     * Close all Git-related editors (Working Tree, Index, and diff editors)
     * @returns The number of editors that were closed
     */
    public async closeAllGitDiffEditors(): Promise<number> {
        const gitRelatedTabs = this.findGitDiffTabs();
        
        if (gitRelatedTabs.length === 0) {
            return 0;
        }

        // Close all identified Git-related tabs
        await vscode.window.tabGroups.close(gitRelatedTabs, true);
        
        return gitRelatedTabs.length;
    }

    /**
     * Find all tabs that represent Git-related editors (diff editors, Index files, Working Tree files)
     * @returns Array of tabs that are Git-related editors
     */
    private findGitDiffTabs(): vscode.Tab[] {
        const gitRelatedTabs: vscode.Tab[] = [];

        // Iterate through all tab groups and their tabs
        for (const tabGroup of vscode.window.tabGroups.all) {
            for (const tab of tabGroup.tabs) {
                if (this.isGitDiffEditor(tab)) {
                    gitRelatedTabs.push(tab);
                }
            }
        }

        return gitRelatedTabs;
    }

    /**
     * Determine if a tab represents a Git diff editor or Git-related editor
     * @param tab The tab to check
     * @returns True if the tab is a Git diff editor or Git-related editor that should be closed
     */
    private isGitDiffEditor(tab: vscode.Tab): boolean {
        // Check for actual diff editors (TabInputTextDiff)
        if (tab.input instanceof vscode.TabInputTextDiff) {
            return this.isActualDiffEditor(tab);
        }

        // Check for single-file Git editors (TabInputText with Git context)
        if (tab.input instanceof vscode.TabInputText) {
            return this.isGitContextEditor(tab);
        }

        return false;
    }

    /**
     * Check if a TabInputTextDiff is a Git diff editor
     */
    private isActualDiffEditor(tab: vscode.Tab): boolean {
        const diffInput = tab.input as vscode.TabInputTextDiff;

        // For Git diff editors, we expect:
        // 1. At least one URI to have a Git-related scheme
        // 2. OR both URIs to point to the same file but different versions
        // 3. OR the label to indicate it's a Git diff

        const isGitSchemeOriginal = this.isGitDiffUri(diffInput.original);
        const isGitSchemeModified = this.isGitDiffUri(diffInput.modified);
        const hasGitScheme = isGitSchemeOriginal || isGitSchemeModified;

        // Check if it's a Git diff by URI schemes
        if (hasGitScheme) {
            return true;
        }

        // Check if it's the same file being compared (typical for Git diffs)
        const originalPath = diffInput.original.path;
        const modifiedPath = diffInput.modified.path;
        const isSameFileDiff = originalPath === modifiedPath && diffInput.original.scheme !== diffInput.modified.scheme;
        
        if (isSameFileDiff) {
            return true;
        }

        // Check by label patterns as fallback
        if (this.isGitDiffLabel(tab.label)) {
            return true;
        }

        return false;
    }

    /**
     * Check if a TabInputText is a Git context editor (like Index files)
     */
    private isGitContextEditor(tab: vscode.Tab): boolean {
        const textInput = tab.input as vscode.TabInputText;

        // For single-file editors (TabInputText), we should be VERY specific
        // Only close if the label explicitly indicates it's a Git context file
        // DO NOT use URI scheme checking for regular files as they use normal 'file:' scheme
        
        // Only check for very specific Git-related label patterns
        if (this.isGitSpecificLabel(tab.label)) {
            return true;
        }

        // Only check URI scheme if it's actually a Git-specific scheme (not 'file:')
        if (textInput.uri.scheme !== 'file' && this.isGitDiffUri(textInput.uri)) {
            return true;
        }

        return false;
    }

    /**
     * Check if a label is specifically Git-related (more restrictive than isGitDiffLabel)
     */
    private isGitSpecificLabel(label: string): boolean {
        // Only match very specific Git context patterns for single files
        const gitSpecificPatterns = [
            /\(Index\)$/i,          // Must end with (Index)
            /\(Working Tree\)$/i,   // Must end with (Working Tree)
            /^Index •/i,            // Starts with "Index •"
            /^Working Tree •/i,     // Starts with "Working Tree •"
        ];
        
        return gitSpecificPatterns.some(pattern => pattern.test(label));
    }

    /**
     * Check if a URI represents a Git diff resource
     * @param uri The URI to check
     * @returns True if the URI is from a Git diff
     */
    private isGitDiffUri(uri: vscode.Uri): boolean {
        // Common Git-related schemes used by VS Code and extensions
        const gitSchemes = [
            'git',              // Standard Git scheme
            'vscode-scm',       // VS Code SCM scheme  
            'gitlens',          // GitLens extension scheme
            'git-graph',        // Git Graph extension
            'git-history',      // Git History extensions
        ];

        // Check if URI uses a Git-related scheme
        if (gitSchemes.includes(uri.scheme)) {
            return true;
        }

        // Check for Git-specific authorities or query parameters that indicate Git context
        if (uri.authority && (
            uri.authority.includes('git') || 
            uri.authority.includes('scm') ||
            uri.authority.includes('diff')
        )) {
            return true;
        }

        // Check query parameters for Git indicators
        const query = uri.query;
        if (query && (
            query.includes('git') ||
            query.includes('scm') ||
            query.includes('working') ||
            query.includes('index') ||
            query.includes('head')
        )) {
            return true;
        }

        return false;
    }

    /**
     * Check if a tab label indicates a Git diff editor
     * @param label The tab label to check
     * @returns True if the label indicates a Git diff editor
     */
    private isGitDiffLabel(label: string): boolean {
        // VS Code Git diff editors typically have these patterns:
        const gitDiffLabels = [
            'Working Tree',
            'Index',
            '↔',              // Diff arrow symbol
            '⟷',              // Alternative diff symbol
            '(Index)',        // VS Code format
            '(Working Tree)', // VS Code format
            ' ↔ ',           // Diff with spaces
            ' • ',           // Sometimes uses bullet
        ];
        
        for (const pattern of gitDiffLabels) {
            if (label.toLowerCase().includes(pattern.toLowerCase())) {
                return true;
            }
        }
        
        // Also check for diff-like patterns with arrows or symbols
        const diffPatterns = [
            /\(Index\)/i,
            /\(Working Tree\)/i,
            /↔/,
            /⟷/,
            /←→/,
            / vs /i,
            / diff /i,
            /\s+•\s+/,        // Bullet separator
            /\s+→\s+/,        // Arrow separator
            /\s+←\s+/,        // Left arrow
        ];
        
        for (const pattern of diffPatterns) {
            if (pattern.test(label)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get count of currently open Git-related editors
     * @returns Number of open Git-related editors
     */
    public getGitDiffEditorCount(): number {
        return this.findGitDiffTabs().length;
    }
}