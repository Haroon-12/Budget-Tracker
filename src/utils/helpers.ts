import { format, differenceInDays, addDays, startOfDay, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { Transaction, Category, TransactionStatement, Account } from '../types';

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  return format(new Date(date), 'MMM dd, yyyy');
};

export const calculateDailySavingsNeeded = (
  targetDate: string,
  targetAmount: number,
  currentAmount: number
): number => {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(targetDate));
  const daysRemaining = differenceInDays(target, today);

  if (daysRemaining <= 0) return 0;

  const amountNeeded = targetAmount - currentAmount;
  return Math.max(0, amountNeeded / daysRemaining);
};

export const getTotalExpenses = (transactions: Transaction[], categoryId?: string): number => {
  return transactions
    .filter((t) => {
      if (t.type !== 'expense') return false;
      if (categoryId) {
        return t.categoryId === categoryId || t.subCategoryId === categoryId;
      }
      return true;
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

export const getTotalSavings = (transactions: Transaction[]): number => {
  return transactions
    .filter((t) => t.type === 'savings')
    .reduce((sum, t) => sum + t.amount, 0);
};

export const getTotalDebt = (transactions: Transaction[]): number => {
  return transactions
    .filter((t) => t.type === 'debt')
    .reduce((sum, t) => sum + t.amount, 0);
};

export const getTransactionsByDateRange = (
  transactions: Transaction[],
  startDate: string,
  endDate: string
): Transaction[] => {
  return transactions.filter((t) => {
    const txDate = new Date(t.date);
    return !isBefore(txDate, new Date(startDate)) && !isAfter(txDate, new Date(endDate));
  });
};

export const getDailySpending = (transactions: Transaction[], date: string): number => {
  const dayStart = startOfDay(new Date(date));
  const dayEnd = addDays(dayStart, 1);

  return transactions
    .filter((t) => {
      if (t.type !== 'expense') return false;
      const txDate = new Date(t.date);
      return txDate >= dayStart && txDate < dayEnd;
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

export const getDailyBudgetUsage = (transactions: Transaction[], date: string): number => {
  const dayStart = startOfDay(new Date(date));
  const dayEnd = addDays(dayStart, 1);

  return transactions
    .filter((t) => {
      // Include expenses, savings, and paid debt - all affect budget
      if (t.type === 'expense' || t.type === 'savings') return true;
      if (t.type === 'debt' && t.isPaid === true) return true; // Only count paid debts
      return false;
    })
    .filter((t) => {
      const txDate = new Date(t.date);
      return txDate >= dayStart && txDate < dayEnd;
    })
    .reduce((sum, t) => {
      // Expenses and paid debt reduce budget, savings also reduces available budget
      return sum + t.amount;
    }, 0);
};

export const getCategoryName = (categoryId: string, categories: Category[]): string => {
  const category = categories.find((c) => c.id === categoryId);
  return category?.name || 'Unknown';
};

export const getSubCategories = (parentId: string | undefined, categories: Category[]): Category[] => {
  if (!parentId) return [];
  return categories.filter((c) => c.parentId === parentId);
};

export const getMainCategories = (categories: Category[]): Category[] => {
  return categories.filter((c) => !c.parentId);
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateTransactionStatement = (
  accountId: string,
  accountName: string,
  transactions: Transaction[],
  startDate: string,
  endDate: string,
  openingBalance: number = 0
): TransactionStatement => {
  const filteredTransactions = transactions
    .filter((t) => {
      const txDate = new Date(t.date);
      return (
        t.accountId === accountId &&
        !isBefore(txDate, new Date(startDate)) &&
        !isAfter(txDate, new Date(endDate))
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = openingBalance;
  const transactionsWithBalances = filteredTransactions.map((t) => {
    if (!t.isVoided) {
      if (t.type === 'expense') {
        runningBalance -= t.amount;
      } else if (t.type === 'debt') {
        // Only deduct debt if it's paid (default to false if undefined)
        if (t.isPaid === true) {
          runningBalance -= t.amount;
        }
      } else if (t.type === 'income' || t.type === 'savings') {
        runningBalance += t.amount;
      }
    }
    return {
      ...t,
      balanceAfter: runningBalance,
    };
  });

  const totalIncome = transactionsWithBalances
    .filter((t) => !t.isVoided && (t.type === 'income' || t.type === 'savings'))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactionsWithBalances
    .filter((t) => !t.isVoided && (t.type === 'expense' || t.type === 'debt'))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalTransfers = transactionsWithBalances
    .filter((t) => !t.isVoided && t.type === 'transfer')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    accountId,
    accountName,
    startDate,
    endDate,
    openingBalance,
    closingBalance: runningBalance,
    transactions: transactionsWithBalances,
    totalIncome,
    totalExpenses,
    totalTransfers,
  };
};

export const getMonthlyStatement = (
  accountId: string,
  accountName: string,
  transactions: Transaction[],
  year: number,
  month: number,
  openingBalance: number = 0
): TransactionStatement => {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));

  return generateTransactionStatement(
    accountId,
    accountName,
    transactions,
    start.toISOString(),
    end.toISOString(),
    openingBalance
  );
};

export const calculateOpeningBalance = (
  accountId: string,
  transactions: Transaction[],
  beforeDate: string
): number => {
  let balance = 0;
  const relevantTransactions = transactions
    .filter((t) => {
      const txDate = new Date(t.date);
      return t.accountId === accountId && isBefore(txDate, new Date(beforeDate));
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  relevantTransactions.forEach((t) => {
    if (!t.isVoided) {
      if (t.type === 'expense') {
        balance -= t.amount;
      } else if (t.type === 'debt') {
        // Only deduct debt if it's paid (default to false if undefined)
        if (t.isPaid === true) {
          balance -= t.amount;
        }
      } else if (t.type === 'income' || t.type === 'savings') {
        balance += t.amount;
      }
    }
  });

  return balance;
};

export const recalculateAccountBalances = (
  accounts: Account[],
  transactions: Transaction[]
): Account[] => {
  return accounts.map((account) => {
    // Get all transactions for this account, sorted by date
    const accountTransactions = transactions
      .filter((t) => t.accountId === account.id && !t.isVoided)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get or infer initial balance
    let initialBalance = account.initialBalance;
    if (initialBalance === undefined) {
      // For existing accounts without initialBalance, infer it
      if (accountTransactions.length === 0) {
        // No transactions - current balance is initial balance
        initialBalance = account.balance;
      } else {
        // Calculate what balance should be from transactions
        let calculatedFromTransactions = 0;
        accountTransactions.forEach((t) => {
          if (!t.isVoided) {
            if (t.type === 'expense') {
              calculatedFromTransactions -= t.amount;
            } else if (t.type === 'debt' && t.isPaid === true) {
              calculatedFromTransactions -= t.amount;
            } else if (t.type === 'income' || t.type === 'savings') {
              calculatedFromTransactions += t.amount;
            }
          }
        });
        // Initial balance = current balance - transactions balance
        initialBalance = account.balance - calculatedFromTransactions;
      }
    }
    
    // Calculate balance from initial balance + all transactions
    let balance = initialBalance || 0;
    accountTransactions.forEach((t) => {
      if (!t.isVoided) {
        if (t.type === 'expense') {
          balance -= t.amount;
        } else if (t.type === 'debt') {
          if (t.isPaid === true) {
            balance -= t.amount;
          }
        } else if (t.type === 'income' || t.type === 'savings') {
          balance += t.amount;
        }
      }
    });
    
    return { ...account, balance, initialBalance: initialBalance };
  });
};

