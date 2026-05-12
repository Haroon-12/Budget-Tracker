# Budget Tracker - Storage System Documentation

## Overview
The storage system has been designed to maintain a complete transaction history similar to banking applications. Transactions are never deleted - they are only marked as voided, preserving the full audit trail.

## Key Features

### 1. **Transaction History Preservation**
- All transactions are stored permanently in localStorage
- Transactions are never deleted, only voided (marked as `isVoided: true`)
- Complete audit trail with `createdAt`, `updatedAt`, and `voidedAt` timestamps
- Balance tracking: Each transaction records `balanceBefore` and `balanceAfter` for statement generation

### 2. **Automatic Backups**
- Automatic backup before every save operation
- Maintains last 5 backups in localStorage
- Automatic recovery if main data becomes corrupted
- Manual backup creation via `createBackup()` function

### 3. **Storage Safety**
- Checks localStorage availability before operations
- Monitors storage size (warns when approaching 5MB limit)
- Handles storage quota exceeded errors gracefully
- Data migration support for future versions

### 4. **Transaction Statement Generation**
- Generate statements for any date range (like bank statements)
- Calculate opening/closing balances
- Track total income, expenses, and transfers
- Monthly statement generation support

### 5. **Data Export/Import**
- Export all data to JSON format
- Import data with validation
- Automatic backup creation before import
- Version tracking for data migration

## Transaction Lifecycle

1. **Create Transaction**
   - Generates unique ID and reference number
   - Records `balanceBefore` and `balanceAfter`
   - Timestamped with `createdAt`
   - Saved to localStorage immediately

2. **Update Transaction**
   - Updates transaction details
   - Recalculates balances based on changes
   - Records `updatedAt` timestamp
   - Maintains original `createdAt`

3. **Void Transaction** (instead of delete)
   - Marks transaction as `isVoided: true`
   - Records `voidedAt` timestamp
   - Reverses balance effect
   - Transaction remains in history

4. **View Transaction History**
   - Filter by account, date range, or status
   - Include or exclude voided transactions
   - Generate statements like banking apps

## Storage Structure

```typescript
{
  accounts: Account[],
  categories: Category[],
  transactions: Transaction[],  // Includes voided transactions
  budgets: Budget[],
  reminders: Reminder[],
  dailyLimitAlerts: DailyLimitAlert[],
  version: string,
  lastBackupAt?: string
}
```

## Usage Examples

### Generate Monthly Statement
```typescript
const statement = getMonthlyStatement(
  accountId,
  accountName,
  transactions,
  2024,
  1, // January
  openingBalance
);
```

### Get All Transactions for Account
```typescript
const accountTransactions = getTransactionsByAccount(accountId, true); // include voided
```

### Export/Import Data
```typescript
// Export
const jsonData = exportData();

// Import
importData(jsonData);
```

## Backup System

- Backups stored with prefix: `budget-tracker-backup-{timestamp}`
- Last 5 backups automatically maintained
- Automatic backup before every save operation
- Recovery: `loadFromBackup()` loads most recent backup if main data fails

## Data Persistence

- All data automatically saved to localStorage on every state change
- No manual save required
- Immediate persistence ensures data is never lost
- Browser refresh maintains all data

