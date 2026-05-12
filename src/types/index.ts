export interface Account {
  id: string;
  name: string;
  balance: number;
  type: 'checking' | 'savings' | 'cash' | 'credit';
  initialBalance?: number; // The starting balance when account was created (before any transactions)
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'debt' | 'savings';
  parentId?: string;
  color: string;
  icon?: string;
}

export interface SubCategory extends Category {
  parentId: string;
}

export interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  subCategoryId?: string;
  accountId: string;
  description: string;
  date: string;
  type: 'expense' | 'income' | 'transfer' | 'savings' | 'debt';
  createdAt: string;
  updatedAt?: string;
  isVoided: boolean;
  voidedAt?: string;
  balanceBefore: number;
  balanceAfter: number;
  referenceNumber?: string;
  tags?: string[];
  isRecurring?: boolean;
  recurringType?: 'monthly' | 'yearly' | 'weekly';
  recurringParentId?: string;
  isRecurringInstance?: boolean;
  isPaid?: boolean; // For debt transactions - only deduct from balance when paid
  paidAt?: string; // Date when debt was marked as paid
}

export interface RecurringSubscription {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  subCategoryId?: string;
  accountId: string;
  startDate: string;
  endDate?: string;
  type: 'monthly' | 'yearly' | 'weekly';
  isActive: boolean;
  lastProcessedDate?: string;
  description?: string;
}

export interface Budget {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  dailyLimit: number;
  categories: BudgetCategory[];
  isActive: boolean;
  useTotalBalance?: boolean; // Flag to indicate if budget should auto-update with account balances
}

export interface BudgetCategory {
  categoryId: string;
  allocatedAmount: number;
  spentAmount: number;
}

export interface Reminder {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  targetAmount: number;
  currentAmount: number;
  accountId: string;
  categoryId?: string;
}

export interface DailyLimitAlert {
  id: string;
  date: string;
  exceededAmount: number;
  dailyLimit: number;
  actualSpending: number;
  actionTaken?: 'updated' | 'adjusted' | 'ignored';
  updatedLimit?: number;
  adjustedFromDate?: string;
  adjustedAmount?: number;
}

export interface AppState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  reminders: Reminder[];
  dailyLimitAlerts: DailyLimitAlert[];
  recurringSubscriptions: RecurringSubscription[];
  currentBudgetId?: string;
  currency: string;
  version: string;
  lastBackupAt?: string;
}

export interface TransactionStatement {
  accountId: string;
  accountName: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  transactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  totalTransfers: number;
}

