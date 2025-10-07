import * as vscode from 'vscode';
import { ExtensionManager } from './core/extensionManager';

let extensionManager: ExtensionManager;

/**
 * Extension activation entry point
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
	try {
		console.log('🚀 CleanX: Starting activation...');
		// vscode.window.showInformationMessage('CleanX extension is activating...');
		
		extensionManager = new ExtensionManager(context);
		await extensionManager.activate();
		
		console.log('✅ CleanX: Activation completed successfully');
		// vscode.window.showInformationMessage('CleanX extension activated! Look for the button in Open Editors panel.');
	} catch (error) {
		console.error('❌ CleanX: Failed to activate extension:', error);
		vscode.window.showErrorMessage(`CleanX activation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		throw error;
	}
}

/**
 * Extension deactivation entry point
 */
export function deactivate(): void {
	extensionManager?.deactivate();
}
