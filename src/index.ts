// Core exports
export { ExtensionManager } from './core/extensionManager';

// Command exports
export { CloseGitDiffEditorsCommand } from './commands/closeGitDiffEditors';
export { SortTabsCommand } from './commands/sortTabs';

// Service exports
export { GitDiffEditorService } from './services/gitDiffEditorService';
export { TabSortingService } from './services/tabSortingService';

// Utility exports
export { ConfigurationManager } from './utils/configurationManager';
export { Logger } from './utils/logger';

// Type exports
export * from './types';