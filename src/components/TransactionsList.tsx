import { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Edit, Trash2, Eye, EyeOff, CheckCircle, Circle } from 'lucide-react';
import TransactionForm from './TransactionForm';
import { Transaction } from '../types';

export default function TransactionsList() {
  const { transactions, accounts, categories, currency, voidTransaction, updateTransaction } = useBudget();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showVoided, setShowVoided] = useState(false);
  const [filterAccount, setFilterAccount] = useState<string>('all');

  const activeTransactions = transactions.filter(t => 
    (showVoided || !t.isVoided) && 
    (filterAccount === 'all' || t.accountId === filterAccount)
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleVoid = (id: string) => {
    if (confirm('Are you sure you want to void this transaction? This will reverse the balance effect.')) {
      voidTransaction(id);
    }
  };

  return (
    <div className="transactions-list">
      <div className="page-header">
        <h2 className="page-title">Transactions</h2>
        <button className="btn-primary" onClick={() => {
          setSelectedTransaction(null);
          setShowForm(true);
        }}>
          Add Transaction
        </button>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Account:</label>
          <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
            <option value="all">All Accounts</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
        <button 
          className="btn-secondary" 
          onClick={() => setShowVoided(!showVoided)}
        >
          {showVoided ? <EyeOff size={16} /> : <Eye size={16} />} 
          {showVoided ? 'Hide' : 'Show'} Voided
        </button>
      </div>

      <div className="transactions-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Account</th>
              <th>Amount</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-state">No transactions found</td>
              </tr>
            ) : (
              activeTransactions.map(tx => {
                const account = accounts.find(a => a.id === tx.accountId);
                const category = categories.find(c => c.id === tx.categoryId || c.id === tx.subCategoryId);
                const isExpense = tx.type === 'expense' || tx.type === 'debt';
                
                return (
                  <tr key={tx.id} className={tx.isVoided ? 'voided' : ''}>
                    <td>{formatDate(tx.date)}</td>
                    <td>{tx.description}</td>
                    <td>{category?.name || 'Unknown'}</td>
                    <td>{account?.name || 'Unknown'}</td>
                    <td className={isExpense ? 'text-danger' : 'text-success'}>
                      {isExpense ? '-' : '+'}{formatCurrency(tx.amount, currency)}
                    </td>
                    <td>{formatCurrency(tx.balanceAfter, currency)}</td>
                    <td>
                      {tx.isVoided ? (
                        <span className="badge badge-voided">Voided</span>
                      ) : tx.type === 'debt' ? (
                        <button
                          className="icon-btn"
                          onClick={() => {
                            if (tx.isPaid) {
                              updateTransaction({ ...tx, isPaid: false, paidAt: undefined });
                            } else {
                              updateTransaction({ ...tx, isPaid: true, paidAt: new Date().toISOString() });
                            }
                          }}
                          title={tx.isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}
                        >
                          {tx.isPaid ? (
                            <CheckCircle size={16} className="text-success" />
                          ) : (
                            <Circle size={16} className="text-warning" />
                          )}
                        </button>
                      ) : (
                        <span className="badge badge-active">Active</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="icon-btn" 
                          onClick={() => {
                            setSelectedTransaction(tx);
                            setShowForm(true);
                          }}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        {!tx.isVoided && (
                          <button 
                            className="icon-btn text-danger" 
                            onClick={() => handleVoid(tx.id)}
                            title="Void"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <TransactionForm 
          transaction={selectedTransaction || undefined} 
          onClose={() => {
            setShowForm(false);
            setSelectedTransaction(null);
          }} 
        />
      )}
    </div>
  );
}

