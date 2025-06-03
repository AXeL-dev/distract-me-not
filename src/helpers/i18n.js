import { isDevEnv, report } from './debug';

const translations = isDevEnv ? require('../../public/_locales/en/messages') : {
  // Diagnostic tab
  diagnose: 'Synchronization',
  syncDiagnosticsDescription: 'Use these tools to diagnose and fix synchronization issues between your devices.',
  runDiagnosis: 'Check Sync Status',
  clearSyncStorage: 'Clear Sync Storage',
  confirmClearSync: 'This will clear your synchronized settings. Local settings will remain. Continue?',
  syncStorageCleared: 'Sync storage has been cleared.',
  syncStorageClearFailed: 'Failed to clear sync storage.',
  syncStatus: 'Sync Status',
  syncAvailable: 'Sync Available',
  storageUsed: 'Storage Used',
  syncedItems: 'Synced Items',
  syncSettingsNote: 'Chrome/Edge sync storage has a limit of ~100KB. If you exceed this limit, settings may not sync properly.',
  syncableSettings: 'Settings That Sync Between Devices',
  localOnlySettings: 'Local-Only Settings',
  syncSettingsList: 'These settings will synchronize between your devices:',
  localSettingsList: 'These settings remain local to each device:',
  enableDisableStatus: 'on/off status',
  passwordSettings: 'security settings',
  timerSettings: 'timer configuration',
  logsSettings: 'logging preferences',
  unknown: 'Unknown',
  
  // New sync diagnostic messages
  browser: 'Browser',
  forceSyncSettings: 'Force Sync Settings',
  forceSyncSuccess: 'Settings forcibly synchronized',  forceSyncFailed: 'Sync attempt failed',
  settingsSynced: 'Settings synced',
  settingsSyncedDescription: 'Your settings were updated from another device',
  syncErrors: 'Sync Errors',
  youtubeDetected: 'YouTube detected in blacklist',
  youtubeDetectedDescription: 'YouTube was found in your blacklist, which might be unintended. You can remove it manually if needed.',
};

export function translate(messageName, substitutions = null) {
  try {
    return browser.i18n.getMessage(messageName, substitutions);
  } catch (error) {
    report.error(error);
  }

  return translations[messageName] ? translations[messageName].message : messageName;
}
