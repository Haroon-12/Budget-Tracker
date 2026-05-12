import { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency, getTotalExpenses, getTotalSavings, getTotalDebt } from '../utils/helpers';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, AlertCircle } from 'lucide-react';
import DailyLimitAlertModal from './DailyLimitAlertModal';
import DailyLeftoverPrompt from './DailyLeftoverPrompt';

export default function Dashboard() {
  const { 
    accounts, 
    transactions, 
    budgets, 
    reminders, 
    dailyLimitAlerts, 
    currency,
    getActiveTransactions,
    handleAlertAction,
    handleLeftoverToSavings,
    checkDailyLimit,
  } = useBudget();

  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [leftoverPrompt, setLeftoverPrompt] = useState<{
    date: string;
    leftoverAmount: number;
    dailyLimit: number;
    actualSpending: number;
  } | null>(null);

  const activeBudget = budgets.find(b => b.isActive);
  
  // Check for daily limits and leftovers when transactions change
  useEffect(() => {
    if (activeBudget) {
      const today = new Date().toISOString().split('T')[0];
      const result = checkDailyLimit(today);
      
      if (result && result.type === 'leftover') {
        // Check if we haven't shown this prompt today
        const shownToday = sessionStorage.getItem(`leftover-${result.date}`);
        if (!shownToday) {
          setLeftoverPrompt(result);
        }
      }
    }
  }, [transactions, activeBudget, checkDailyLimit]);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const activeTransactions = getActiveTransactions ? getActiveTransactions() : transactions.filter(t => !t.isVoided);
  const totalExpenses = getTotalExpenses(activeTransactions);
  const totalSavings = getTotalSavings(activeTransactions);
  const totalDebt = getTotalDebt(activeTransactions);
  const activeReminders = reminders.filter(r => new Date(r.targetDate) >= new Date());

  return (
    <div className="dashboard">
      <h2 className="page-title">Dashboard</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#3b82f6' }}>
            <Wallet size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Balance</h3>
            <p className="stat-value">{formatCurrency(totalBalance, currency)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ef4444' }}>
            <TrendingDown size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Expenses</h3>
            <p className="stat-value text-danger">{formatCurrency(totalExpenses, currency)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#10b981' }}>
            <PiggyBank size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Savings</h3>
            <p className="stat-value text-success">{formatCurrency(totalSavings, currency)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f59e0b' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Debt</h3>
            <p className="stat-value text-warning">{formatCurrency(totalDebt, currency)}</p>
          </div>
        </div>
      </div>

      <div className="accounts-section">
        <h3>Accounts</h3>
        <div className="accounts-grid">
          {accounts.map(account => (
            <div key={account.id} className="account-card">
              <h4>{account.name}</h4>
              <p className="account-type">{account.type}</p>
              <p className="account-balance">{formatCurrency(account.balance, currency)}</p>
            </div>
          ))}
        </div>
      </div>

      {activeBudget && (() => {
        // Calculate budget usage including expenses, savings, and debt from all accounts
        const activeTransactions = getActiveTransactions ? getActiveTransactions() : transactions.filter(t => !t.isVoided);
        const budgetTransactions = activeTransactions.filter(t => 
          t.type === 'expense' || (t.type === 'debt' && t.isPaid === true) || t.type === 'savings'
        );
        const totalUsed = budgetTransactions
          .filter(t => {
            const txDate = new Date(t.date);
            const startDate = new Date(activeBudget.startDate);
            const endDate = new Date(activeBudget.endDate);
            return txDate >= startDate && txDate <= endDate;
          })
          .reduce((sum, t) => sum + t.amount, 0);
        const remainingBudget = activeBudget.totalAmount - totalUsed;
        const budgetPercentage = activeBudget.totalAmount > 0 
          ? (totalUsed / activeBudget.totalAmount) * 100 
          : 0;

        // Get main account balance
        const mainAccount = accounts.find(a => a.type === 'checking');
        const mainAccountBalance = mainAccount?.balance || 0;

        return (
          <div className="budget-status">
            <h3>Active Budget</h3>
            <div className="budget-card">
              <h4>{activeBudget.name}</h4>
              <p><strong>Total Budget:</strong> {formatCurrency(activeBudget.totalAmount, currency)}</p>
              <p><strong>Main Account Balance:</strong> {formatCurrency(mainAccountBalance, currency)}</p>
              <p><strong>Used (Expenses + Savings + Paid Debt):</strong> {formatCurrency(totalUsed, currency)}</p>
              <p><strong>Remaining:</strong> {formatCurrency(remainingBudget, currency)}</p>
              <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${Math.min(budgetPercentage, 100)}%`,
                    backgroundColor: budgetPercentage > 80 ? 'var(--danger-color)' : budgetPercentage > 60 ? 'var(--warning-color)' : 'var(--success-color)'
                  }}
                />
              </div>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {budgetPercentage.toFixed(1)}% of budget used
              </p>
              <p>Daily Limit: {formatCurrency(activeBudget.dailyLimit, currency)}</p>
              <p>Period: {new Date(activeBudget.startDate).toLocaleDateString()} - {new Date(activeBudget.endDate).toLocaleDateString()}</p>
            </div>
          </div>
        );
      })()}

      {dailyLimitAlerts.length > 0 && (
        <div className="alerts-section">
          <h3><AlertCircle size={20} /> Alerts</h3>
          {dailyLimitAlerts.filter(a => !a.actionTaken).map(alert => (
            <div 
              key={alert.id} 
              className="alert-card alert-warning clickable"
              onClick={() => setSelectedAlert(alert.id)}
            >
              <div className="alert-content">
                <AlertCircle size={20} />
                <div>
                  <p><strong>Daily spending limit exceeded</strong></p>
                  <p>Exceeded by {formatCurrency(alert.exceededAmount, currency)} on {new Date(alert.date).toLocaleDateString()}</p>
                  <p className="alert-hint">Click to manage this alert</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAlert && activeBudget && (
        <DailyLimitAlertModal
          alert={dailyLimitAlerts.find(a => a.id === selectedAlert)!}
          budget={activeBudget}
          onClose={() => setSelectedAlert(null)}
          onAction={handleAlertAction}
        />
      )}

      {leftoverPrompt && activeBudget && (
        <DailyLeftoverPrompt
          date={leftoverPrompt.date}
          leftoverAmount={leftoverPrompt.leftoverAmount}
          dailyLimit={leftoverPrompt.dailyLimit}
          actualSpending={leftoverPrompt.actualSpending}
          onClose={() => {
            setLeftoverPrompt(null);
            sessionStorage.setItem(`leftover-${leftoverPrompt.date}`, 'shown');
          }}
          onAddToSavings={(amount, accountId) => {
            handleLeftoverToSavings(leftoverPrompt.date, amount, accountId);
          }}
          onSpend={() => {
            setLeftoverPrompt(null);
            sessionStorage.setItem(`leftover-${leftoverPrompt.date}`, 'shown');
          }}
        />
      )}

      {activeReminders.length > 0 && (
        <div className="reminders-section">
          <h3>Active Reminders</h3>
          {activeReminders.slice(0, 3).map(reminder => (
            <div key={reminder.id} className="reminder-card">
              <h4>{reminder.title}</h4>
              <p>{reminder.description}</p>
              <p>Target: {formatCurrency(reminder.targetAmount, currency)} by {new Date(reminder.targetDate).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

