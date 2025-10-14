// Core exports
export { ExtensionManager } from './core/extensionManager';

// Command exports
export { CloseGitDiffEditorsCommand } from './commands/closeGitDiffEditors';
export { SortTabsCommand } from './commands/sortTabs';
export { SaveTabWorkspaceCommand } from './commands/saveTabWorkspace';
export { LoadTabWorkspaceCommand } from './commands/loadTabWorkspace';

// Service exports
export { GitDiffEditorService } from './services/gitDiffEditorService';
export { TabSortingService } from './services/tabSortingService';
export { TabWorkspaceService } from './services/tabWorkspaceService';
export { GitignoreService } from './services/gitignoreService';

// Utility exports
export { ConfigurationManager } from './utils/configurationManager';
export { Logger } from './utils/logger';

// Type exports
export * from './types';