import * as vscode from 'vscode';

/**
 * Configuration options for the extension
 */
export interface ExtensionConfig {
    showNotifications: boolean;
    confirmBeforeClosing: boolean;
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