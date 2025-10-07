import * as vscode from 'vscode';

/**
 * Centralized logging utility for the extension
 */
export class Logger {
    private static outputChannel: vscode.OutputChannel;

    /**
     * Initialize the logger
     */
    public static initialize(extensionName: string): void {
        this.outputChannel = vscode.window.createOutputChannel(extensionName);
    }

    /**
     * Log an info message
     */
    public static info(message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] INFO: ${message}`;
        
        this.outputChannel.appendLine(logMessage);
        
        if (data) {
            this.outputChannel.appendLine(`Data: ${JSON.stringify(data, null, 2)}`);
        }
        
        console.log(logMessage, data);
    }

    /**
     * Log an error message
     */
    public static error(message: string, error?: Error | any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ERROR: ${message}`;
        
        this.outputChannel.appendLine(logMessage);
        
        if (error) {
            const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error, null, 2);
            this.outputChannel.appendLine(`Error details: ${errorDetails}`);
        }
        
        console.error(logMessage, error);
    }

    /**
     * Log a debug message
     */
    public static debug(message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] DEBUG: ${message}`;
        
        this.outputChannel.appendLine(logMessage);
        
        if (data) {
            this.outputChannel.appendLine(`Data: ${JSON.stringify(data, null, 2)}`);
        }
        
        console.debug(logMessage, data);
    }

    /**
     * Show the output channel
     */
    public static show(): void {
        this.outputChannel.show();
    }

    /**
     * Dispose of the logger resources
     */
    public static dispose(): void {
        this.outputChannel?.dispose();
    }
}