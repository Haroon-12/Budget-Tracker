import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, Transaction, Account, Category, Budget, Reminder, DailyLimitAlert, RecurringSubscription } from '../types';
import { getInitialState, saveState, loadState } from '../utils/storage';
import { getDailyBudgetUsage, generateId, recalculateAccountBalances, formatCurrency } from '../utils/helpers';

type BudgetAction =
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'VOID_TRANSACTION'; payload: string }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'ADD_ACCOUNT'; payload: Account }
  | { type: 'UPDATE_ACCOUNT'; payload: Account }
  | { type: 'DELETE_ACCOUNT'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'CREATE_BUDGET'; payload: Budget }
  | { type: 'UPDATE_BUDGET'; payload: Budget }
  | { type: 'DELETE_BUDGET'; payload: string }
  | { type: 'SET_ACTIVE_BUDGET'; payload: string }
  | { type: 'ADD_REMINDER'; payload: Reminder }
  | { type: 'UPDATE_REMINDER'; payload: Reminder }
  | { type: 'DELETE_REMINDER'; payload: string }
  | { type: 'ADD_DAILY_LIMIT_ALERT'; payload: DailyLimitAlert }
  | { type: 'UPDATE_DAILY_LIMIT_ALERT'; payload: DailyLimitAlert }
  | { type: 'ADD_RECURRING_SUBSCRIPTION'; payload: RecurringSubscription }
  | { type: 'UPDATE_RECURRING_SUBSCRIPTION'; payload: RecurringSubscription }
  | { type: 'DELETE_RECURRING_SUBSCRIPTION'; payload: string }
  | { type: 'SET_CURRENCY'; payload: string }
  | { type: 'LOAD_STATE'; payload: AppState };

interface BudgetContextType extends AppState {
  dispatch: React.Dispatch<BudgetAction>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'isVoided' | 'balanceBefore' | 'balanceAfter'>) => void;
  voidTransaction: (id: string) => void;
  updateTransaction: (transaction: Transaction) => void;
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
  createBudget: (budget: Omit<Budget, 'id'>) => void;
  deleteBudget: (id: string) => void;
  addReminder: (reminder: Omit<Reminder, 'id'>) => void;
  deleteReminder: (id: string) => void;
  addRecurringSubscription: (subscription: Omit<RecurringSubscription, 'id'>) => void;
  updateRecurringSubscription: (subscription: RecurringSubscription) => void;
  deleteRecurringSubscription: (id: string) => void;
  setCurrency: (currency: string) => void;
  checkDailyLimit: (date: string) => void | { type: 'leftover'; date: string; leftoverAmount: number; dailyLimit: number; actualSpending: number };
  handleAlertAction: (alertId: string, action: 'updated' | 'adjusted' | 'ignored', data?: any) => void;
  handleLeftoverToSavings: (date: string, amount: number, accountId: string) => void;
  getActiveTransactions: () => Transaction[];
  getTransactionsByAccount: (accountId: string, includeVoided?: boolean) => Transaction[];
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

const budgetReducer = (state: AppState, action: BudgetAction): AppState => {
  switch (action.type) {
    case 'ADD_TRANSACTION': {
      const transaction = action.payload;
      const account = state.accounts.find((a) => a.id === transaction.accountId);
      if (!account) return state;

      // Calculate balance correctly by considering transaction date order
      // Get all existing transactions for this account, sorted by date
      const accountTransactions = state.transactions
        .filter((t) => t.accountId === transaction.accountId && !t.isVoided)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate balance up to this transaction's date
      let balanceBefore = 0;
      accountTransactions.forEach((t) => {
        if (new Date(t.date) < new Date(transaction.date)) {
          if (t.type === 'expense') {
            balanceBefore -= t.amount;
          } else if (t.type === 'debt') {
            // Only deduct debt if it's paid (default to false if undefined)
            if (t.isPaid === true) {
              balanceBefore -= t.amount;
            }
          } else if (t.type === 'income' || t.type === 'savings') {
            balanceBefore += t.amount;
          }
        }
      });

      // Calculate balance after this transaction
      let balanceAfter = balanceBefore;
      if (!transaction.isVoided) {
        if (transaction.type === 'expense') {
          balanceAfter -= transaction.amount;
        } else if (transaction.type === 'debt') {
          // Only deduct debt if it's paid (default to false if undefined)
          if (transaction.isPaid === true) {
            balanceAfter -= transaction.amount;
          }
          // If unpaid, balanceAfter stays the same as balanceBefore
        } else if (transaction.type === 'income' || transaction.type === 'savings') {
          balanceAfter += transaction.amount;
        }
      }

      // Update account balance to reflect the latest balance
      // Recalculate from ALL transactions (including the new one) to ensure accuracy
      const allAccountTransactions = [...accountTransactions, transaction]
        .filter((t) => !t.isVoided)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Get or set initial balance - if this is the first transaction, preserve current balance as initial
      let initialBalance = account.initialBalance;
      if (initialBalance === undefined && accountTransactions.length === 0) {
        // First transaction - current account balance is the initial balance
        initialBalance = account.balance;
      } else if (initialBalance === undefined) {
        // Migrate existing accounts - infer initial balance
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
        initialBalance = account.balance - calculatedFromTransactions;
      }
      
      // Calculate balance from ALL transactions starting from initial balance
      let finalBalance = initialBalance || 0;
      allAccountTransactions.forEach((t) => {
        if (!t.isVoided) {
          if (t.type === 'expense') {
            finalBalance -= t.amount;
          } else if (t.type === 'debt') {
            // Only deduct debt if it's paid
            if (t.isPaid === true) {
              finalBalance -= t.amount;
            }
          } else if (t.type === 'income' || t.type === 'savings') {
            finalBalance += t.amount;
          }
          // Transfer type doesn't affect balance (it's handled by affecting two accounts)
        }
      });

      const updatedAccounts = state.accounts.map((a) =>
        a.id === transaction.accountId 
          ? { ...a, balance: finalBalance, initialBalance: initialBalance } 
          : a
      );

      // Auto-update active budget if it uses total balance (only from main account)
      let updatedBudgets = state.budgets;
      const activeBudget = state.budgets.find((b) => b.id === state.currentBudgetId && b.isActive);
      if (activeBudget && activeBudget.useTotalBalance) {
        const mainAccount = updatedAccounts.find(a => a.type === 'checking');
        const mainAccountBalance = mainAccount?.balance || 0;
        const days = Math.ceil((new Date(activeBudget.endDate).getTime() - new Date(activeBudget.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const newDailyLimit = days > 0 ? mainAccountBalance / days : activeBudget.dailyLimit;
        
        updatedBudgets = state.budgets.map((b) =>
          b.id === activeBudget.id
            ? { ...b, totalAmount: mainAccountBalance, dailyLimit: newDailyLimit }
            : b
        );
      }

      const transactionWithMetadata: Transaction = {
        ...transaction,
        balanceBefore,
        balanceAfter,
      };

      return {
        ...state,
        transactions: [...state.transactions, transactionWithMetadata],
        accounts: updatedAccounts,
        budgets: updatedBudgets,
      };
    }

    case 'VOID_TRANSACTION': {
      const transaction = state.transactions.find((t) => t.id === action.payload && !t.isVoided);
      if (!transaction) return state;

      const account = state.accounts.find((a) => a.id === transaction.accountId);
      if (!account) return state;

      const balanceBefore = account.balance;
      let balanceAfter = balanceBefore;

      // Reverse the transaction effect
      if (transaction.type === 'expense') {
        balanceAfter += transaction.amount;
      } else if (transaction.type === 'debt' && transaction.isPaid === true) {
        // Only reverse if debt was paid
        balanceAfter += transaction.amount;
      } else if (transaction.type === 'income' || transaction.type === 'savings') {
        balanceAfter -= transaction.amount;
      }
      
      // Recalculate balance from all transactions
      const accountTransactions = state.transactions
        .filter((t) => t.accountId === transaction.accountId && !t.isVoided && t.id !== transaction.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let finalBalance = 0;
      accountTransactions.forEach((t) => {
        if (t.type === 'expense') {
          finalBalance -= t.amount;
        } else if (t.type === 'debt') {
          if (t.isPaid === true) {
            finalBalance -= t.amount;
          }
        } else if (t.type === 'income' || t.type === 'savings') {
          finalBalance += t.amount;
        }
      });
      balanceAfter = finalBalance;

      const updatedAccounts = state.accounts.map((a) =>
        a.id === transaction.accountId ? { ...a, balance: balanceAfter } : a
      );

      const voidedTransaction: Transaction = {
        ...transaction,
        isVoided: true,
        voidedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        balanceBefore,
        balanceAfter,
      };

      // Auto-update active budget if it uses total balance (only from main account)
      let updatedBudgets = state.budgets;
      const activeBudget = state.budgets.find((b) => b.id === state.currentBudgetId && b.isActive);
      if (activeBudget && activeBudget.useTotalBalance) {
        const mainAccount = updatedAccounts.find(a => a.type === 'checking');
        const mainAccountBalance = mainAccount?.balance || 0;
        const days = Math.ceil((new Date(activeBudget.endDate).getTime() - new Date(activeBudget.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const newDailyLimit = days > 0 ? mainAccountBalance / days : activeBudget.dailyLimit;
        
        updatedBudgets = state.budgets.map((b) =>
          b.id === activeBudget.id
            ? { ...b, totalAmount: mainAccountBalance, dailyLimit: newDailyLimit }
            : b
        );
      }

      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload ? voidedTransaction : t
        ),
        accounts: updatedAccounts,
        budgets: updatedBudgets,
      };
    }

    case 'UPDATE_TRANSACTION': {
      const updatedTransaction = action.payload;
      const existingTransaction = state.transactions.find((t) => t.id === updatedTransaction.id);
      if (!existingTransaction) return state;

      const account = state.accounts.find((a) => a.id === updatedTransaction.accountId);
      if (!account) return state;

      // Recalculate balance from all transactions (excluding the one being updated, then add it back)
      const accountTransactionsWithoutUpdated = state.transactions
        .filter((t) => t.accountId === updatedTransaction.accountId && !t.isVoided && t.id !== updatedTransaction.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Calculate balance before the updated transaction's date
      let balanceBefore = 0;
      accountTransactionsWithoutUpdated.forEach((t) => {
        if (new Date(t.date) < new Date(updatedTransaction.date)) {
          if (!t.isVoided) {
            if (t.type === 'expense') {
              balanceBefore -= t.amount;
            } else if (t.type === 'debt') {
              if (t.isPaid === true) {
                balanceBefore -= t.amount;
              }
            } else if (t.type === 'income' || t.type === 'savings') {
              balanceBefore += t.amount;
            }
          }
        }
      });

      // Calculate balance after the updated transaction
      let balanceAfter = balanceBefore;
      if (!updatedTransaction.isVoided) {
        if (updatedTransaction.type === 'expense') {
          balanceAfter -= updatedTransaction.amount;
        } else if (updatedTransaction.type === 'debt') {
          if (updatedTransaction.isPaid === true) {
            balanceAfter -= updatedTransaction.amount;
          }
        } else if (updatedTransaction.type === 'income' || updatedTransaction.type === 'savings') {
          balanceAfter += updatedTransaction.amount;
        }
      }

      // Recalculate final balance from ALL transactions including the updated one
      const allAccountTransactions = [...accountTransactionsWithoutUpdated, updatedTransaction]
        .filter((t) => !t.isVoided)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Get or set initial balance
      let initialBalance = account.initialBalance;
      if (initialBalance === undefined) {
        // Migrate existing accounts - infer initial balance
        let calculatedFromTransactions = 0;
        accountTransactionsWithoutUpdated.forEach((t) => {
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
        initialBalance = account.balance - calculatedFromTransactions;
      }
      
      // Calculate balance from ALL transactions starting from initial balance
      let finalBalance = initialBalance || 0;
      allAccountTransactions.forEach((t) => {
        if (!t.isVoided) {
          if (t.type === 'expense') {
            finalBalance -= t.amount;
          } else if (t.type === 'debt') {
            if (t.isPaid === true) {
              finalBalance -= t.amount;
            }
          } else if (t.type === 'income' || t.type === 'savings') {
            finalBalance += t.amount;
          }
        }
      });

      const updatedAccounts = state.accounts.map((a) =>
        a.id === updatedTransaction.accountId 
          ? { ...a, balance: finalBalance, initialBalance: initialBalance } 
          : a
      );

      // Auto-update active budget if it uses total balance (only from main account)
      let updatedBudgets = state.budgets;
      const activeBudget = state.budgets.find((b) => b.id === state.currentBudgetId && b.isActive);
      if (activeBudget && activeBudget.useTotalBalance) {
        const mainAccount = updatedAccounts.find(a => a.type === 'checking');
        const mainAccountBalance = mainAccount?.balance || 0;
        const days = Math.ceil((new Date(activeBudget.endDate).getTime() - new Date(activeBudget.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const newDailyLimit = days > 0 ? mainAccountBalance / days : activeBudget.dailyLimit;
        
        updatedBudgets = state.budgets.map((b) =>
          b.id === activeBudget.id
            ? { ...b, totalAmount: mainAccountBalance, dailyLimit: newDailyLimit }
            : b
        );
      }

      const transactionWithMetadata: Transaction = {
        ...updatedTransaction,
        balanceBefore,
        balanceAfter,
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === updatedTransaction.id ? transactionWithMetadata : t
        ),
        accounts: updatedAccounts,
        budgets: updatedBudgets,
      };
    }

    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] };

    case 'UPDATE_ACCOUNT': {
      // Preserve initialBalance when updating account
      const updatedAccounts = state.accounts.map((a) => {
        if (a.id === action.payload.id) {
          // If updating balance and initialBalance is not set, preserve it
          const initialBalance = action.payload.initialBalance !== undefined 
            ? action.payload.initialBalance 
            : a.initialBalance;
          return { ...action.payload, initialBalance };
        }
        return a;
      });
      
      // Auto-update active budget if it uses total balance (only from main account)
      let updatedBudgets = state.budgets;
      const activeBudget = state.budgets.find((b) => b.id === state.currentBudgetId && b.isActive);
      if (activeBudget && activeBudget.useTotalBalance) {
        const mainAccount = updatedAccounts.find(a => a.type === 'checking');
        const mainAccountBalance = mainAccount?.balance || 0;
        const days = Math.ceil((new Date(activeBudget.endDate).getTime() - new Date(activeBudget.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const newDailyLimit = days > 0 ? mainAccountBalance / days : activeBudget.dailyLimit;
        
        updatedBudgets = state.budgets.map((b) =>
          b.id === activeBudget.id
            ? { ...b, totalAmount: mainAccountBalance, dailyLimit: newDailyLimit }
            : b
        );
      }

      return {
        ...state,
        accounts: updatedAccounts,
        budgets: updatedBudgets,
      };
    }

    case 'DELETE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.filter((a) => a.id !== action.payload),
        transactions: state.transactions.filter((t) => t.accountId !== action.payload),
      };

    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };

    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
        transactions: state.transactions.filter(
          (t) => t.categoryId !== action.payload && t.subCategoryId !== action.payload
        ),
      };

    case 'CREATE_BUDGET':
      return {
        ...state,
        budgets: [...state.budgets, action.payload],
        currentBudgetId: action.payload.id,
      };

    case 'UPDATE_BUDGET':
      return {
        ...state,
        budgets: state.budgets.map((b) => (b.id === action.payload.id ? action.payload : b)),
      };

    case 'DELETE_BUDGET':
      return {
        ...state,
        budgets: state.budgets.filter((b) => b.id !== action.payload),
        currentBudgetId: state.currentBudgetId === action.payload ? undefined : state.currentBudgetId,
      };

    case 'SET_ACTIVE_BUDGET':
      return { ...state, currentBudgetId: action.payload };

    case 'SET_CURRENCY':
      return { ...state, currency: action.payload };

    case 'ADD_REMINDER':
      return { ...state, reminders: [...state.reminders, action.payload] };

    case 'UPDATE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.map((r) => (r.id === action.payload.id ? action.payload : r)),
      };

    case 'DELETE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.filter((r) => r.id !== action.payload),
      };

    case 'ADD_DAILY_LIMIT_ALERT':
      return {
        ...state,
        dailyLimitAlerts: [...state.dailyLimitAlerts, action.payload],
      };

    case 'UPDATE_DAILY_LIMIT_ALERT':
      return {
        ...state,
        dailyLimitAlerts: state.dailyLimitAlerts.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };

    case 'ADD_RECURRING_SUBSCRIPTION':
      return {
        ...state,
        recurringSubscriptions: [...state.recurringSubscriptions, action.payload],
      };

    case 'UPDATE_RECURRING_SUBSCRIPTION':
      return {
        ...state,
        recurringSubscriptions: state.recurringSubscriptions.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      };

    case 'DELETE_RECURRING_SUBSCRIPTION':
      return {
        ...state,
        recurringSubscriptions: state.recurringSubscriptions.filter((s) => s.id !== action.payload),
        transactions: state.transactions.filter((t) => t.recurringParentId !== action.payload),
      };

    case 'LOAD_STATE': {
      // Recalculate account balances from transactions to ensure accuracy
      const recalculatedAccounts = recalculateAccountBalances(
        action.payload.accounts,
        action.payload.transactions
      );
      return {
        ...action.payload,
        accounts: recalculatedAccounts,
      };
    }

    default:
      return state;
  }
};

export const BudgetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(budgetReducer, getInitialState());

  useEffect(() => {
    const savedState = loadState();
    if (savedState) {
      dispatch({ type: 'LOAD_STATE', payload: savedState });
    }
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Check for subscription reminders daily
  useEffect(() => {
    const checkSubscriptionReminders = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      state.recurringSubscriptions.forEach((subscription) => {
        if (!subscription.isActive) return;

        // Calculate next due date
        const startDate = new Date(subscription.startDate);
        const lastProcessed = subscription.lastProcessedDate ? new Date(subscription.lastProcessedDate) : startDate;
        let nextDate = new Date(lastProcessed);
        
        if (subscription.type === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (subscription.type === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else if (subscription.type === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        }

        // If next date is in the past, calculate from today
        while (nextDate < today && subscription.isActive) {
          if (subscription.type === 'monthly') {
            nextDate.setMonth(nextDate.getMonth() + 1);
          } else if (subscription.type === 'yearly') {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
          } else if (subscription.type === 'weekly') {
            nextDate.setDate(nextDate.getDate() + 7);
          }
        }

        // Check if reminder should be shown (1 day before due date)
        const reminderDate = new Date(nextDate);
        reminderDate.setDate(reminderDate.getDate() - 1);
        reminderDate.setHours(0, 0, 0, 0);

        // Create reminder if today is the reminder date and reminder doesn't exist
        if (reminderDate.getTime() === today.getTime()) {
          const reminderTitle = `${subscription.name} Due Tomorrow`;
          const existingReminder = state.reminders.find(
            (r) => r.title === reminderTitle && r.targetDate === nextDate.toISOString().split('T')[0]
          );

          if (!existingReminder) {
            const reminder: Reminder = {
              id: generateId(),
              title: reminderTitle,
              description: `Your subscription "${subscription.name}" (${formatCurrency(subscription.amount, state.currency)}) is due on ${nextDate.toLocaleDateString()}.`,
              targetDate: nextDate.toISOString().split('T')[0],
              targetAmount: subscription.amount,
              currentAmount: 0,
              accountId: subscription.accountId,
              categoryId: subscription.categoryId,
            };
            dispatch({ type: 'ADD_REMINDER', payload: reminder });
          }
        }
      });
    };

    // Check immediately and then daily
    checkSubscriptionReminders();
    const interval = setInterval(checkSubscriptionReminders, 24 * 60 * 60 * 1000); // Check daily

    return () => clearInterval(interval);
  }, [state.recurringSubscriptions, state.reminders, state.currency, dispatch]);

  const addTransaction = (
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'isVoided' | 'balanceBefore' | 'balanceAfter'>
  ) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: generateId(),
      createdAt: new Date().toISOString(),
      isVoided: false,
      balanceBefore: 0,
      balanceAfter: 0,
      referenceNumber: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    };
    dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
    checkDailyLimit(newTransaction.date);
  };

  const voidTransaction = (id: string) => {
    dispatch({ type: 'VOID_TRANSACTION', payload: id });
  };

  const updateTransaction = (transaction: Transaction) => {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: transaction });
  };

  const getActiveTransactions = (): Transaction[] => {
    return state.transactions.filter((t) => !t.isVoided);
  };

  const getTransactionsByAccount = (accountId: string, includeVoided = false): Transaction[] => {
    return state.transactions.filter(
      (t) => t.accountId === accountId && (includeVoided || !t.isVoided)
    );
  };

  const addAccount = (account: Omit<Account, 'id'>) => {
    const newAccount: Account = {
      ...account,
      id: generateId(),
      initialBalance: account.balance, // Set initial balance when account is created
    };
    dispatch({ type: 'ADD_ACCOUNT', payload: newAccount });
  };

  const updateAccount = (account: Account) => {
    dispatch({ type: 'UPDATE_ACCOUNT', payload: account });
  };

  const deleteAccount = (id: string) => {
    dispatch({ type: 'DELETE_ACCOUNT', payload: id });
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...category,
      id: generateId(),
    };
    dispatch({ type: 'ADD_CATEGORY', payload: newCategory });
  };

  const deleteCategory = (id: string) => {
    dispatch({ type: 'DELETE_CATEGORY', payload: id });
  };

  const createBudget = (budget: Omit<Budget, 'id'>) => {
    const newBudget: Budget = {
      ...budget,
      id: generateId(),
    };
    dispatch({ type: 'CREATE_BUDGET', payload: newBudget });
  };

  const deleteBudget = (id: string) => {
    dispatch({ type: 'DELETE_BUDGET', payload: id });
  };

  const addReminder = (reminder: Omit<Reminder, 'id'>) => {
    const newReminder: Reminder = {
      ...reminder,
      id: generateId(),
    };
    dispatch({ type: 'ADD_REMINDER', payload: newReminder });
  };

  const deleteReminder = (id: string) => {
    dispatch({ type: 'DELETE_REMINDER', payload: id });
  };

  const setCurrency = (currency: string) => {
    dispatch({ type: 'SET_CURRENCY', payload: currency });
  };

  const addRecurringSubscription = (subscription: Omit<RecurringSubscription, 'id'>) => {
    const newSubscription: RecurringSubscription = {
      ...subscription,
      id: generateId(),
    };
    dispatch({ type: 'ADD_RECURRING_SUBSCRIPTION', payload: newSubscription });
    
    // Create the first transaction instance
    const account = state.accounts.find(a => a.id === subscription.accountId);
    if (!account) return;

    const balanceBefore = account.balance;
    const balanceAfter = balanceBefore - subscription.amount;

    const firstTransaction: Transaction = {
      id: generateId(),
      amount: subscription.amount,
      categoryId: subscription.categoryId,
      subCategoryId: subscription.subCategoryId,
      accountId: subscription.accountId,
      description: subscription.description || subscription.name,
      date: subscription.startDate,
      type: 'expense',
      createdAt: new Date().toISOString(),
      isVoided: false,
      balanceBefore,
      balanceAfter,
      isRecurring: false,
      isRecurringInstance: true,
      recurringParentId: newSubscription.id,
      referenceNumber: `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    };
    
    // Update account balance and add transaction
    const updatedAccount = { ...account, balance: balanceAfter };
    dispatch({ type: 'UPDATE_ACCOUNT', payload: updatedAccount });
    dispatch({ type: 'ADD_TRANSACTION', payload: firstTransaction });
  };

  const updateRecurringSubscription = (subscription: RecurringSubscription) => {
    dispatch({ type: 'UPDATE_RECURRING_SUBSCRIPTION', payload: subscription });
  };

  const deleteRecurringSubscription = (id: string) => {
    dispatch({ type: 'DELETE_RECURRING_SUBSCRIPTION', payload: id });
  };

  const checkDailyLimit = (date: string) => {
    const activeBudget = state.budgets.find((b) => b.id === state.currentBudgetId && b.isActive);
    if (!activeBudget) return;

    // Only check active (non-voided) transactions
    const activeTransactions = state.transactions.filter((t) => !t.isVoided);
    // Use budget usage which includes expenses, savings, and debt across all accounts
    const dailyUsage = getDailyBudgetUsage(activeTransactions, date);
    
    // Check if exceeded
    if (dailyUsage > activeBudget.dailyLimit) {
      const existingAlert = state.dailyLimitAlerts.find((a) => a.date === date && !a.actionTaken);
      if (!existingAlert) {
        const alert: DailyLimitAlert = {
          id: generateId(),
          date,
          exceededAmount: dailyUsage - activeBudget.dailyLimit,
          dailyLimit: activeBudget.dailyLimit,
          actualSpending: dailyUsage,
        };
        dispatch({ type: 'ADD_DAILY_LIMIT_ALERT', payload: alert });
      }
    }
    // Check if there's leftover (usage is less than limit)
    else if (dailyUsage < activeBudget.dailyLimit * 0.8) {
      const leftoverAmount = activeBudget.dailyLimit - dailyUsage;
      // Only show if leftover is significant (more than 20% of limit)
      if (leftoverAmount > activeBudget.dailyLimit * 0.2) {
        // This will be handled by the UI component
        return { 
          type: 'leftover' as const, 
          date, 
          leftoverAmount, 
          dailyLimit: activeBudget.dailyLimit, 
          actualSpending: dailyUsage 
        };
      }
    }
  };

  const handleAlertAction = (alertId: string, action: 'updated' | 'adjusted' | 'ignored', data?: any) => {
    const alert = state.dailyLimitAlerts.find(a => a.id === alertId);
    if (!alert) return;

    const updatedAlert: DailyLimitAlert = {
      ...alert,
      actionTaken: action,
      ...data,
    };

    // If updating limit, update the budget
    if (action === 'updated' && data?.updatedLimit) {
      const activeBudget = state.budgets.find((b) => b.id === state.currentBudgetId && b.isActive);
      if (activeBudget) {
        const updatedBudget: Budget = {
          ...activeBudget,
          dailyLimit: data.updatedLimit,
        };
        dispatch({ type: 'UPDATE_BUDGET', payload: updatedBudget });
      }
    }

    dispatch({ type: 'UPDATE_DAILY_LIMIT_ALERT', payload: updatedAlert });
  };

  const handleLeftoverToSavings = (date: string, amount: number, accountId: string) => {
    const savingsCategory = state.categories.find(c => c.type === 'savings');
    if (!savingsCategory) {
      // Create a default savings category if none exists
      const defaultSavings: Category = {
        id: generateId(),
        name: 'Savings',
        type: 'savings',
        color: '#36A2EB',
      };
      dispatch({ type: 'ADD_CATEGORY', payload: defaultSavings });
      addTransaction({
        amount,
        categoryId: defaultSavings.id,
        accountId,
        description: `Daily leftover savings - ${new Date(date).toLocaleDateString()}`,
        date,
        type: 'savings',
      });
      return;
    }

    addTransaction({
      amount,
      categoryId: savingsCategory.id,
      accountId,
      description: `Daily leftover savings - ${new Date(date).toLocaleDateString()}`,
      date,
      type: 'savings',
    });
  };

  const value: BudgetContextType = {
    ...state,
    dispatch,
    addTransaction,
    voidTransaction,
    updateTransaction,
    addAccount,
    updateAccount,
    deleteAccount,
    addCategory,
    deleteCategory,
    createBudget,
    deleteBudget,
    addReminder,
    deleteReminder,
    addRecurringSubscription,
    updateRecurringSubscription,
    deleteRecurringSubscription,
    setCurrency,
    checkDailyLimit,
    handleAlertAction,
    handleLeftoverToSavings,
    getActiveTransactions,
    getTransactionsByAccount,
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};

export const useBudget = () => {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};

