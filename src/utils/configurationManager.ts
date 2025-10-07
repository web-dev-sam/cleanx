import * as vscode from 'vscode';
import { ExtensionConfig } from '../types';

/**
 * Manages extension configuration settings
 */
export class ConfigurationManager {
    private static readonly EXTENSION_NAME = 'cleanx';

    /**
     * Get the current extension configuration
     */
    public static getConfig(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration(this.EXTENSION_NAME);
        
        return {
            showNotifications: config.get('showNotifications', true),
            confirmBeforeClosing: config.get('confirmBeforeClosing', false),
        };
    }

    /**
     * Watch for configuration changes
     * @param callback Function to call when configuration changes
     * @returns Disposable to stop watching
     */
    public static onConfigurationChanged(
        callback: (config: ExtensionConfig) => void
    ): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(this.EXTENSION_NAME)) {
                callback(this.getConfig());
            }
        });
    }
}