import * as vscode from 'vscode';

/**
 * Configuration options for the extension
 */
export interface ExtensionConfig {
    showNotifications: boolean;
    confirmBeforeClosing: boolean;
    sortAfterClosing: boolean;
    customFileTypeOrder: string[];
}

/**
 * Statistics about Git diff editor operations
 */
export interface GitDiffEditorStats {
    totalFound: number;
    totalClosed: number;
    errors: string[];
}

/**
 * Extension context wrapper for better type safety
 */
export interface ExtensionContextWrapper {
    readonly context: vscode.ExtensionContext;
    readonly subscriptions: vscode.Disposable[];
    
    registerDisposable(disposable: vscode.Disposable): void;
}

/**
 * Represents a saved tab workspace with all open file paths
 */
export interface TabWorkspace {
    name: string;
    tabs: string[]; // Array of file paths (URI strings)
    createdAt: Date;
    lastModified: Date;
}

/**
 * Extension state for managing tab workspaces
 */
export interface TabWorkspaceState {
    workspaces: TabWorkspace[];
    currentWorkspace?: string; // Name of the currently active workspace
    previousWorkspace?: TabWorkspace; // Auto-saved workspace before loading new one
}

/**
 * Information about a tab for workspace operations
 */
export interface TabInfo {
    uri?: vscode.Uri;
    originalUri?: vscode.Uri;
    modifiedUri?: vscode.Uri;
    viewType?: string;
    isActive: boolean;
    isPinned: boolean;
    label: string;
    viewColumn: vscode.ViewColumn;
}