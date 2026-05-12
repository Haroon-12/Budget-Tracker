import { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { Transaction } from '../types';
import { Plus, X } from 'lucide-react';

interface TransactionFormProps {
  onClose: () => void;
  transaction?: Transaction;
}

export default function TransactionForm({ onClose, transaction }: TransactionFormProps) {
  const { accounts, categories, addTransaction, updateTransaction, addRecurringSubscription } = useBudget();
  const [formData, setFormData] = useState({
    amount: transaction?.amount || 0,
    categoryId: transaction?.categoryId || '',
    subCategoryId: transaction?.subCategoryId || '',
    accountId: transaction?.accountId || accounts[0]?.id || '',
    description: transaction?.description || '',
    date: transaction?.date || new Date().toISOString().split('T')[0],
    type: transaction?.type || 'expense' as Transaction['type'],
    isRecurring: false,
    recurringType: 'monthly' as 'monthly' | 'yearly' | 'weekly',
    recurringScope: 'monthly' as 'monthly' | 'one-time',
    isPaid: transaction?.isPaid || false, // For debt transactions
  });

  // Filter categories by transaction type
  const mainCategories = categories.filter(c => {
    if (c.parentId) return false; // Only main categories
    // Match categories by type (expense/debt are both expense type, savings is savings, income/transfer can use any)
    if (formData.type === 'expense' || formData.type === 'debt') {
      return c.type === 'expense' || c.type === 'debt';
    }
    if (formData.type === 'savings') {
      return c.type === 'savings';
    }
    if (formData.type === 'income' || formData.type === 'transfer') {
      return true; // Income and transfers can use any category
    }
    return false;
  });
  const subCategories = formData.categoryId ? categories.filter(c => c.parentId === formData.categoryId) : [];

  const { checkDailyLimit } = useBudget();

  // Reset category when transaction type changes
  const handleTypeChange = (newType: Transaction['type']) => {
    setFormData({ 
      ...formData, 
      type: newType, 
      categoryId: '', 
      subCategoryId: '' 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (accounts.length === 0) {
      alert('Please create an account first before adding transactions.');
      return;
    }
    
    if (mainCategories.length === 0) {
      alert('Please create a category for this transaction type first.');
      return;
    }
    
    if (!formData.accountId || !formData.categoryId) {
      alert('Please fill in all required fields.');
      return;
    }
    
    if (formData.amount <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }
    
    if (transaction) {
      updateTransaction({
        ...transaction,
        ...formData,
        date: new Date(formData.date).toISOString(),
        isPaid: formData.type === 'debt' ? formData.isPaid : transaction.isPaid,
        paidAt: formData.type === 'debt' 
          ? (formData.isPaid ? (transaction.isPaid ? transaction.paidAt : new Date().toISOString()) : undefined)
          : transaction.paidAt,
      });
    } else {
      // If it's a recurring subscription
      if (formData.isRecurring && formData.recurringScope === 'monthly') {
        addRecurringSubscription({
          name: formData.description,
          amount: formData.amount,
          categoryId: formData.categoryId,
          subCategoryId: formData.subCategoryId || undefined,
          accountId: formData.accountId,
          startDate: new Date(formData.date).toISOString(),
          type: formData.recurringType,
          isActive: true,
          description: formData.description,
        });
      } else {
        // Regular one-time transaction
        addTransaction({
          amount: formData.amount,
          categoryId: formData.categoryId,
          subCategoryId: formData.subCategoryId || undefined,
          accountId: formData.accountId,
          description: formData.description,
          date: new Date(formData.date).toISOString(),
          type: formData.type,
          isPaid: formData.type === 'debt' ? formData.isPaid : undefined,
          paidAt: formData.type === 'debt' && formData.isPaid ? new Date().toISOString() : undefined,
        });
      }
      
      // Check daily limit after adding transaction
      setTimeout(() => {
        checkDailyLimit(formData.date);
      }, 100);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{transaction ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="form-group">
            <label>Type</label>
            <select
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value as Transaction['type'])}
              required
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="savings">Savings</option>
              <option value="debt">Debt</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="form-group">
            <label>Account</label>
            {accounts.length === 0 ? (
              <div className="form-error">
                <p>No accounts available. Please create an account first.</p>
                <p className="form-hint">Go to Accounts section to add a new account.</p>
              </div>
            ) : (
              <select
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                required
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label>Category</label>
            {mainCategories.length === 0 ? (
              <div className="form-error">
                <p>No categories available for this transaction type. Please create a category first.</p>
                <p className="form-hint">Go to Categories section to add a new category.</p>
              </div>
            ) : (
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, subCategoryId: '' })}
                required
              >
                <option value="">Select Category</option>
                {mainCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            )}
          </div>

          {subCategories.length > 0 && (
            <div className="form-group">
              <label>Sub Category</label>
              <select
                value={formData.subCategoryId}
                onChange={(e) => setFormData({ ...formData, subCategoryId: e.target.value })}
              >
                <option value="">None</option>
                {subCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {formData.type === 'debt' && (
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.isPaid}
                  onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                />
                Mark as Paid (will deduct from account balance)
              </label>
              <p className="form-hint">
                Unpaid debts are tracked but don't affect your account balance until marked as paid.
              </p>
            </div>
          )}

          {formData.type === 'expense' && (
            <>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  />
                  This is a recurring expense/subscription
                </label>
              </div>

              {formData.isRecurring && (
                <>
                  <div className="form-group">
                    <label>Recurring Frequency</label>
                    <select
                      value={formData.recurringType}
                      onChange={(e) => setFormData({ ...formData, recurringType: e.target.value as 'monthly' | 'yearly' | 'weekly' })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Apply to</label>
                    <select
                      value={formData.recurringScope}
                      onChange={(e) => setFormData({ ...formData, recurringScope: e.target.value as 'monthly' | 'one-time' })}
                    >
                      <option value="monthly">Each month (recurring subscription)</option>
                      <option value="one-time">Just this month (one-time)</option>
                    </select>
                    <p className="form-hint">
                      {formData.recurringScope === 'monthly' 
                        ? 'This will create a recurring subscription that automatically generates expenses'
                        : 'This will only apply to the current month'}
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              <Plus size={16} /> {transaction ? 'Update' : 'Add'} Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

