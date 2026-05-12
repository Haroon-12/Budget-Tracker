import { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/helpers';
import { X, PiggyBank, ShoppingCart } from 'lucide-react';

interface DailyLeftoverPromptProps {
  date: string;
  leftoverAmount: number;
  dailyLimit: number;
  actualSpending: number;
  onClose: () => void;
  onAddToSavings: (amount: number, accountId: string) => void;
  onSpend: () => void;
}

export default function DailyLeftoverPrompt({
  date,
  leftoverAmount,
  dailyLimit,
  actualSpending,
  onClose,
  onAddToSavings,
  onSpend,
}: DailyLeftoverPromptProps) {
  const { accounts, currency } = useBudget();
  const [selectedAccount, setSelectedAccount] = useState(
    accounts.find(a => a.type === 'savings')?.id || accounts[0]?.id || ''
  );

  const savingsAccounts = accounts.filter(a => a.type === 'savings');
  const hasSavingsAccount = savingsAccounts.length > 0;

  const handleAddToSavings = () => {
    if (!selectedAccount) {
      window.alert('Please select a savings account');
      return;
    }
    onAddToSavings(leftoverAmount, selectedAccount);
    onClose();
  };

  useEffect(() => {
    if (hasSavingsAccount && savingsAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(savingsAccounts[0].id);
    }
  }, [hasSavingsAccount, savingsAccounts, selectedAccount]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content leftover-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Leftover Daily Budget</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="alert-body">
          <div className="leftover-info">
            <p><strong>Date:</strong> {new Date(date).toLocaleDateString()}</p>
            <p><strong>Daily Limit:</strong> {formatCurrency(dailyLimit, currency)}</p>
            <p><strong>Actual Spending:</strong> {formatCurrency(actualSpending, currency)}</p>
            <p className="leftover-amount">
              <strong>Leftover Amount:</strong> {formatCurrency(leftoverAmount, currency)}
            </p>
          </div>

          <div className="action-options">
            <h3>What would you like to do with the leftover amount?</h3>

            {hasSavingsAccount && (
              <button className="action-btn" onClick={handleAddToSavings}>
                <PiggyBank size={24} />
                <div>
                  <strong>Add to Savings</strong>
                  <p>Transfer {formatCurrency(leftoverAmount, currency)} to your savings account</p>
                  {savingsAccounts.length > 1 && (
                    <select
                      className="account-select"
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {savingsAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </button>
            )}

            <button className="action-btn" onClick={onSpend}>
              <ShoppingCart size={24} />
              <div>
                <strong>Keep for Future Spending</strong>
                <p>Leave it in your account for future expenses</p>
              </div>
            </button>

            <button
              className="action-btn btn-secondary"
              onClick={onClose}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

