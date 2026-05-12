import { AppState } from '../types';

const STORAGE_KEY = 'budget-tracker-data';
const STORAGE_VERSION = '1.0.0';
const BACKUP_KEY_PREFIX = 'budget-tracker-backup-';
const MAX_BACKUPS = 5;

// Check if localStorage is available and has space
const isStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

const cleanupOldBackups = (): void => {
  try {
    const backups: Array<{ key: string; timestamp: number }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
        const timestamp = parseInt(key.replace(BACKUP_KEY_PREFIX, ''), 10);
        if (!isNaN(timestamp)) {
          backups.push({ key, timestamp });
        }
      }
    }

    backups.sort((a, b) => b.timestamp - a.timestamp);

    if (backups.length > MAX_BACKUPS) {
      backups.slice(MAX_BACKUPS).forEach((backup) => {
        localStorage.removeItem(backup.key);
      });
    }
  } catch (err) {
    console.error('Error cleaning up backups:', err);
  }
};

export const loadState = (): AppState | null => {
  if (!isStorageAvailable()) {
    console.error('LocalStorage is not available');
    return null;
  }

  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (serializedState === null) {
      return null;
    }

    const state = JSON.parse(serializedState) as AppState;

    // Migrate old data if needed
    if (!state.version || state.version !== STORAGE_VERSION) {
      state.version = STORAGE_VERSION;
      if (!state.transactions.some((t) => 'createdAt' in t)) {
        state.transactions = state.transactions.map((t) => ({
          ...t,
          createdAt: t.date || new Date().toISOString(),
          isVoided: false,
          balanceBefore: 0,
          balanceAfter: 0,
        }));
      }
      if (!state.currency) {
        state.currency = 'USD';
      }
    }

    return state;
  } catch (err) {
    console.error('Error loading state:', err);
    // Try to load from backup
    return loadFromBackup();
  }
};

export const saveState = (state: AppState): void => {
  if (!isStorageAvailable()) {
    console.error('LocalStorage is not available');
    return;
  }

  try {
    const stateToSave = {
      ...state,
      version: STORAGE_VERSION,
    };

    const serializedState = JSON.stringify(stateToSave);
    const size = new Blob([serializedState]).size;

    // Check if we're approaching storage limit (5MB limit for most browsers)
    if (size > 4 * 1024 * 1024) {
      console.warn('Storage size is getting large. Consider cleaning up old data.');
    }

    // Create backup before saving
    createBackup();

    // Save current state
    localStorage.setItem(STORAGE_KEY, serializedState);

    // Cleanup old backups
    cleanupOldBackups();
  } catch (err) {
    console.error('Error saving state:', err);
    if (err instanceof DOMException && err.code === 22) {
      console.error('Storage quota exceeded. Please free up space.');
    }
  }
};

export const createBackup = (): void => {
  try {
    const currentState = localStorage.getItem(STORAGE_KEY);
    if (currentState) {
      const timestamp = Date.now();
      const backupKey = `${BACKUP_KEY_PREFIX}${timestamp}`;
      localStorage.setItem(backupKey, currentState);
    }
  } catch (err) {
    console.error('Error creating backup:', err);
  }
};

export const loadFromBackup = (): AppState | null => {
  try {
    const backups: Array<{ key: string; timestamp: number }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
        const timestamp = parseInt(key.replace(BACKUP_KEY_PREFIX, ''), 10);
        if (!isNaN(timestamp)) {
          backups.push({ key, timestamp });
        }
      }
    }

    if (backups.length === 0) {
      return null;
    }

    backups.sort((a, b) => b.timestamp - a.timestamp);
    const latestBackup = backups[0];
    const backupData = localStorage.getItem(latestBackup.key);
    if (backupData) {
      return JSON.parse(backupData) as AppState;
    }
  } catch (err) {
    console.error('Error loading from backup:', err);
  }
  return null;
};

export const exportData = (): string => {
  try {
    const state = loadState();
    if (!state) {
      throw new Error('No data to export');
    }
    return JSON.stringify(state, null, 2);
  } catch (err) {
    console.error('Error exporting data:', err);
    throw err;
  }
};

export const importData = (jsonData: string): AppState => {
  try {
    const importedState = JSON.parse(jsonData) as AppState;
    
    // Validate structure
    if (!importedState.accounts || !importedState.transactions || !importedState.categories) {
      throw new Error('Invalid data format');
    }

    // Create backup before importing
    createBackup();

    // Set version
    importedState.version = STORAGE_VERSION;

    // Save imported state
    saveState(importedState);

    return importedState;
  } catch (err) {
    console.error('Error importing data:', err);
    throw err;
  }
};

export const clearAllData = (): void => {
  try {
    // Create final backup before clearing
    createBackup();
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Error clearing data:', err);
  }
};

export const getInitialState = (): AppState => {
  const savedState = loadState();
  if (savedState) {
    return savedState;
  }

  return {
    accounts: [
      { id: '1', name: 'Main Account', balance: 0, type: 'checking' },
      { id: '2', name: 'Savings Account', balance: 0, type: 'savings' },
    ],
    categories: [
      { id: 'exp-1', name: 'Food', type: 'expense', parentId: 'exp-main', color: '#FF6B6B' },
      { id: 'exp-2', name: 'Grocery', type: 'expense', parentId: 'exp-main', color: '#4ECDC4' },
      { id: 'exp-3', name: 'Travel', type: 'expense', parentId: 'exp-main', color: '#45B7D1' },
      { id: 'exp-4', name: 'Planned Events', type: 'expense', parentId: 'exp-main', color: '#FFA07A' },
      { id: 'exp-main', name: 'Expenses', type: 'expense', color: '#FF6384' },
      { id: 'debt-main', name: 'Debt', type: 'debt', color: '#FF6384' },
      { id: 'sav-main', name: 'Savings', type: 'savings', color: '#36A2EB' },
    ],
    transactions: [],
    budgets: [],
    reminders: [],
    dailyLimitAlerts: [],
    recurringSubscriptions: [],
    currency: 'USD',
    version: STORAGE_VERSION,
  };
};

