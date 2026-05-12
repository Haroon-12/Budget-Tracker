import { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { DailyLimitAlert, Budget } from '../types';
import { formatCurrency } from '../utils/helpers';
import { X, AlertTriangle, Calculator } from 'lucide-react';
import { differenceInDays, addDays, startOfDay, isBefore } from 'date-fns';

interface DailyLimitAlertModalProps {
  alert: DailyLimitAlert;
  budget: Budget;
  onClose: () => void;
  onAction: (alertId: string, action: 'updated' | 'adjusted' | 'ignored', data?: any) => void;
}

export default function DailyLimitAlertModal({ alert, budget, onClose, onAction }: DailyLimitAlertModalProps) {
  const { transactions, accounts, currency } = useBudget();
  const [actionType, setActionType] = useState<'update' | 'adjust' | null>(null);
  const [adjustmentDate, setAdjustmentDate] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [calculatedLimit, setCalculatedLimit] = useState(0);

  const alertDate = new Date(alert.date);
  const today = startOfDay(new Date());
  const endDate = new Date(budget.endDate);
  const daysRemaining = differenceInDays(endDate, today) + 1;
  
  // Calculate remaining budget - includes expenses, savings, and paid debt from all accounts
  const activeTransactions = transactions.filter(t => 
    !t.isVoided && (t.type === 'expense' || (t.type === 'debt' && t.isPaid === true) || t.type === 'savings')
  );
  const totalUsed = activeTransactions
    .filter(t => {
      const txDate = new Date(t.date);
      return isBefore(txDate, today) || txDate.toDateString() === today.toDateString();
    })
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Remaining budget = total budget amount - total used (across all accounts)
  const remainingBudget = budget.totalAmount - totalUsed;
  const suggestedDailyLimit = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;
  
  // Show main account balance (since budget uses main account)
  const mainAccount = accounts.find(a => a.type === 'checking');
  const mainAccountBalance = mainAccount?.balance || 0;

  useEffect(() => {
    if (actionType === 'update') {
      setCalculatedLimit(suggestedDailyLimit);
    }
  }, [actionType, suggestedDailyLimit]);

  const handleUpdateLimit = () => {
    onAction(alert.id, 'updated', {
      updatedLimit: calculatedLimit,
    });
    onClose();
  };

  const handleAdjustFromFuture = () => {
    if (!adjustmentDate || adjustmentAmount <= 0) {
      window.alert('Please select a date and amount to adjust');
      return;
    }
    onAction(alert.id, 'adjusted', {
      adjustedFromDate: adjustmentDate,
      adjustedAmount: adjustmentAmount,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content alert-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="alert-header-content">
            <AlertTriangle size={24} className="text-warning" />
            <h2>Daily Spending Limit Exceeded</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="alert-body">
          <div className="alert-info">
            <p><strong>Date:</strong> {alertDate.toLocaleDateString()}</p>
            <p><strong>Daily Limit:</strong> {formatCurrency(alert.dailyLimit, currency)}</p>
            <p><strong>Actual Spending:</strong> {formatCurrency(alert.actualSpending, currency)}</p>
            <p className="exceeded-amount"><strong>Exceeded by:</strong> {formatCurrency(alert.exceededAmount, currency)}</p>
          </div>

          <div className="budget-summary">
            <h3>Budget Summary</h3>
            <p>Total Budget: {formatCurrency(budget.totalAmount, currency)}</p>
            <p>Main Account Balance: {formatCurrency(mainAccountBalance, currency)}</p>
            <p>Used So Far (Expenses + Savings + Paid Debt): {formatCurrency(totalUsed, currency)}</p>
            <p>Remaining Budget: {formatCurrency(remainingBudget, currency)}</p>
            <p>Days Remaining: {daysRemaining}</p>
            <p className="highlight">Suggested Daily Limit: {formatCurrency(suggestedDailyLimit, currency)}</p>
          </div>

          {!actionType && (
            <div className="action-options">
              <h3>What would you like to do?</h3>
              <button
                className="action-btn"
                onClick={() => setActionType('update')}
              >
                <Calculator size={20} />
                <div>
                  <strong>Update Daily Limit</strong>
                  <p>Update daily limit for remaining days based on remaining budget</p>
                </div>
              </button>

              <button
                className="action-btn"
                onClick={() => setActionType('adjust')}
              >
                <Calculator size={20} />
                <div>
                  <strong>Adjust from Future Day</strong>
                  <p>Reduce spending from a future day where you might not need the money</p>
                </div>
              </button>

              <button
                className="action-btn btn-secondary"
                onClick={() => {
                  onAction(alert.id, 'ignored');
                  onClose();
                }}
              >
                Ignore for Now
              </button>
            </div>
          )}

          {actionType === 'update' && (
            <div className="action-form">
              <h3>Update Daily Limit</h3>
              <div className="form-group">
                <label>New Daily Limit (calculated from remaining budget)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={calculatedLimit.toFixed(2)}
                  onChange={(e) => setCalculatedLimit(parseFloat(e.target.value) || 0)}
                />
                <p className="form-hint">
                  This will update your daily limit to {formatCurrency(calculatedLimit, currency)} for the remaining {daysRemaining} days
                </p>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setActionType(null)}>
                  Back
                </button>
                <button className="btn-primary" onClick={handleUpdateLimit}>
                  Update Limit
                </button>
              </div>
            </div>
          )}

          {actionType === 'adjust' && (
            <div className="action-form">
              <h3>Adjust from Future Day</h3>
              <div className="form-group">
                <label>Select Date to Adjust</label>
                <input
                  type="date"
                  value={adjustmentDate}
                  onChange={(e) => setAdjustmentDate(e.target.value)}
                  min={addDays(today, 1).toISOString().split('T')[0]}
                  max={endDate.toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="form-group">
                <label>Amount to Reduce</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={alert.exceededAmount}
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
                  required
                />
                <p className="form-hint">
                  Reduce up to {formatCurrency(alert.exceededAmount, currency)} from the selected future day
                </p>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setActionType(null)}>
                  Back
                </button>
                <button className="btn-primary" onClick={handleAdjustFromFuture}>
                  Apply Adjustment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

