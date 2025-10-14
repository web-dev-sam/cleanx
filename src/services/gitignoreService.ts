import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from '../utils/logger';

/**
 * Service for checking if files should be ignored based on .gitignore patterns
 */
export class GitignoreService {
    private gitignorePatterns: Map<string, string[]> = new Map(); // workspace folder -> patterns
    private patternCache: Map<string, boolean> = new Map(); // file path -> isIgnored

    constructor() {
        // Watch for .gitignore file changes
        this.setupGitignoreWatcher();
    }

    /**
     * Check if a file path should be ignored based on .gitignore patterns
     * @param filePath Absolute file path to check
     * @returns true if the file should be ignored, false otherwise
     */
    public async isIgnored(filePath: string): Promise<boolean> {
        try {
            // Check cache first
            const cached = this.patternCache.get(filePath);
            if (cached !== undefined) {
                return cached;
            }

            // Find workspace folder for this file
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
            if (!workspaceFolder) {
                // No workspace folder found, don't ignore
                this.patternCache.set(filePath, false);
                return false;
            }

            const workspacePath = workspaceFolder.uri.fsPath;
            
            // Load patterns for this workspace if not already loaded
            if (!this.gitignorePatterns.has(workspacePath)) {
                await this.loadGitignorePatterns(workspacePath);
            }

            const patterns = this.gitignorePatterns.get(workspacePath) || [];
            const relativePath = path.relative(workspacePath, filePath);
            
            // Check if file matches any gitignore pattern
            const isIgnored = this.matchesGitignorePattern(relativePath, patterns);
            
            // Cache result
            this.patternCache.set(filePath, isIgnored);
            
            return isIgnored;
        } catch (error) {
            Logger.error('Error checking if file is ignored', error);
            // On error, don't ignore the file
            return false;
        }
    }

    /**
     * Filter out ignored files from a list of file paths
     * @param filePaths Array of file paths to filter
     * @returns Array of file paths that are not ignored
     */
    public async filterIgnoredFiles(filePaths: string[]): Promise<string[]> {
        const results = await Promise.all(
            filePaths.map(async (filePath) => ({
                filePath,
                isIgnored: await this.isIgnored(filePath)
            }))
        );

        return results
            .filter(result => !result.isIgnored)
            .map(result => result.filePath);
    }

    /**
     * Load .gitignore patterns for a workspace folder
     */
    private async loadGitignorePatterns(workspacePath: string): Promise<void> {
        try {
            const gitignoreUri = vscode.Uri.file(path.join(workspacePath, '.gitignore'));
            
            try {
                const document = await vscode.workspace.openTextDocument(gitignoreUri);
                const content = document.getText();
                
                const patterns = content
                    .split(/\r?\n/)
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && !line.startsWith('#'))
                    .map(pattern => this.normalizeGitignorePattern(pattern));

                this.gitignorePatterns.set(workspacePath, patterns);
                
                // Clear cache when patterns change
                this.clearCacheForWorkspace(workspacePath);
                
                Logger.debug(`Loaded ${patterns.length} gitignore patterns for ${workspacePath}`);
            } catch (error) {
                // .gitignore file doesn't exist or can't be read
                this.gitignorePatterns.set(workspacePath, []);
                Logger.debug(`No .gitignore found for ${workspacePath}`, error);
            }
        } catch (error) {
            Logger.error('Error loading gitignore patterns', error);
            this.gitignorePatterns.set(workspacePath, []);
        }
    }

    /**
     * Normalize a gitignore pattern for matching
     */
    private normalizeGitignorePattern(pattern: string): string {
        // Remove leading slash
        if (pattern.startsWith('/')) {
            pattern = pattern.substring(1);
        }
        
        // Convert to regex-friendly format
        pattern = pattern
            .replace(/\./g, '\\.')  // Escape dots
            .replace(/\*/g, '.*')   // Convert * to .*
            .replace(/\?/g, '.');   // Convert ? to .

        return pattern;
    }

    /**
     * Check if a relative path matches any gitignore pattern
     */
    private matchesGitignorePattern(relativePath: string, patterns: string[]): boolean {
        // Normalize path separators
        const normalizedPath = relativePath.replace(/\\/g, '/');
        
        for (const pattern of patterns) {
            try {
                // Check exact match
                if (pattern === normalizedPath) {
                    return true;
                }
                
                // Check regex pattern match
                const regex = new RegExp(`^${pattern}$`);
                if (regex.test(normalizedPath)) {
                    return true;
                }
                
                // Check if it matches any parent directory
                const pathParts = normalizedPath.split('/');
                for (let i = 0; i < pathParts.length; i++) {
                    const partialPath = pathParts.slice(0, i + 1).join('/');
                    const partialRegex = new RegExp(`^${pattern}$`);
                    if (partialRegex.test(partialPath)) {
                        return true;
                    }
                }
                
                // Check directory pattern (pattern ending with /)
                if (pattern.endsWith('/')) {
                    const dirPattern = pattern.slice(0, -1);
                    const dirRegex = new RegExp(`^${dirPattern}(/.*)?$`);
                    if (dirRegex.test(normalizedPath)) {
                        return true;
                    }
                }
            } catch (error) {
                // Invalid regex pattern, skip
                Logger.debug(`Invalid gitignore pattern: ${pattern}`, error);
                continue;
            }
        }
        
        return false;
    }

    /**
     * Clear cache for a specific workspace
     */
    private clearCacheForWorkspace(workspacePath: string): void {
        const keysToDelete: string[] = [];
        
        for (const [filePath] of this.patternCache) {
            if (filePath.startsWith(workspacePath)) {
                keysToDelete.push(filePath);
            }
        }
        
        for (const key of keysToDelete) {
            this.patternCache.delete(key);
        }
    }

    /**
     * Setup file system watcher for .gitignore files
     */
    private setupGitignoreWatcher(): void {
        const watcher = vscode.workspace.createFileSystemWatcher('**/.gitignore');
        
        const reloadPatterns = (uri: vscode.Uri) => {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
            if (workspaceFolder) {
                const workspacePath = workspaceFolder.uri.fsPath;
                this.loadGitignorePatterns(workspacePath);
            }
        };

        watcher.onDidCreate(reloadPatterns);
        watcher.onDidChange(reloadPatterns);
        watcher.onDidDelete(reloadPatterns);
    }

    /**
     * Clear all cached data
     */
    public clearCache(): void {
        this.patternCache.clear();
        this.gitignorePatterns.clear();
    }
}