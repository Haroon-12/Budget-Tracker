import { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { Account } from '../types';
import { formatCurrency } from '../utils/helpers';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function AccountsManagement() {
  const { accounts, currency, addAccount, updateAccount, deleteAccount } = useBudget();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    balance: 0,
    type: 'checking' as Account['type'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAccount) {
      updateAccount({ ...editingAccount, ...formData });
    } else {
      addAccount(formData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', balance: 0, type: 'checking' });
    setEditingAccount(null);
    setShowForm(false);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      balance: account.balance,
      type: account.type,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this account? This will also delete all associated transactions.')) {
      deleteAccount(id);
    }
  };

  return (
    <div className="accounts-management">
      <div className="page-header">
        <h2 className="page-title">Accounts</h2>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={16} /> Add Account
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3>{editingAccount ? 'Edit Account' : 'Add Account'}</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label>Account Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Account['type'] })}
                required
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            <div className="form-group">
              <label>Initial Balance</label>
              <input
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingAccount ? 'Update' : 'Add'} Account
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="accounts-grid">
        {accounts.map(account => (
          <div key={account.id} className="account-card">
            <div className="account-header">
              <h3>{account.name}</h3>
              <div className="account-actions">
                <button className="icon-btn" onClick={() => handleEdit(account)}>
                  <Edit size={16} />
                </button>
                <button className="icon-btn text-danger" onClick={() => handleDelete(account.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="account-type">{account.type}</p>
            <p className="account-balance">{formatCurrency(account.balance, currency)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

