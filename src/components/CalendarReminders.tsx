import { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency, calculateDailySavingsNeeded, formatDate } from '../utils/helpers';
import { Plus, Calendar, Target, AlertCircle, Trash2 } from 'lucide-react';

export default function CalendarReminders() {
  const { reminders, accounts, categories, addReminder, deleteReminder, currency } = useBudget();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetDate: '',
    targetAmount: 0,
    accountId: accounts[0]?.id || '',
    categoryId: '',
  });

  const today = new Date();
  const activeReminders = reminders.filter(r => new Date(r.targetDate) >= today);
  const pastReminders = reminders.filter(r => new Date(r.targetDate) < today);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addReminder({
      ...formData,
      currentAmount: 0,
    });
    setFormData({
      title: '',
      description: '',
      targetDate: '',
      targetAmount: 0,
      accountId: accounts[0]?.id || '',
      categoryId: '',
    });
    setShowForm(false);
  };

  const getDaysRemaining = (targetDate: string) => {
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="calendar-reminders">
      <div className="page-header">
        <h2 className="page-title">Calendar & Reminders</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Add Reminder
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3>Add Reminder</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Vacation Fund"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label><Calendar size={16} /> Target Date</label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  min={today.toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="form-group">
                <label><Target size={16} /> Target Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Account</label>
              <select
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                required
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Category (optional)</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">None</option>
                {categories.filter(c => c.type === 'savings').map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {formData.targetDate && formData.targetAmount > 0 && (
              <div className="info-box">
                <p><strong>Estimated Daily Savings Needed:</strong></p>
                <p className="highlight">
                      {formatCurrency(calculateDailySavingsNeeded(
                        formData.targetDate,
                        formData.targetAmount,
                        0
                      ), currency)}
                </p>
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Add Reminder
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="reminders-section">
        <h3>Active Reminders</h3>
        {activeReminders.length === 0 ? (
          <p className="empty-state">No active reminders. Add one to track your savings goals!</p>
        ) : (
          activeReminders.map(reminder => {
            const daysRemaining = getDaysRemaining(reminder.targetDate);
            const dailyNeeded = calculateDailySavingsNeeded(
              reminder.targetDate,
              reminder.targetAmount,
              reminder.currentAmount
            );
            const progress = (reminder.currentAmount / reminder.targetAmount) * 100;
            const account = accounts.find(a => a.id === reminder.accountId);

            return (
              <div key={reminder.id} className="reminder-card">
                <div className="reminder-header">
                  <h4>{reminder.title}</h4>
                  {daysRemaining <= 7 && (
                    <span className="badge badge-warning">
                      <AlertCircle size={14} /> {daysRemaining} days left
                    </span>
                  )}
                </div>
                <p className="reminder-description">{reminder.description}</p>
                <div className="reminder-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="progress-text">
                    {formatCurrency(reminder.currentAmount, currency)} / {formatCurrency(reminder.targetAmount, currency)} ({progress.toFixed(1)}%)
                  </div>
                </div>
                <div className="reminder-details">
                  <p><strong>Target Date:</strong> {formatDate(reminder.targetDate)} ({daysRemaining} days remaining)</p>
                  <p><strong>Daily Savings Needed:</strong> {formatCurrency(dailyNeeded, currency)}</p>
                  <p><strong>Account:</strong> {account?.name || 'Unknown'}</p>
                </div>
                <div className="reminder-actions">
                  <button
                    className="icon-btn text-danger"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this reminder?')) {
                        deleteReminder(reminder.id);
                      }
                    }}
                    title="Delete reminder"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {pastReminders.length > 0 && (
        <div className="reminders-section">
          <h3>Past Reminders</h3>
          {pastReminders.map(reminder => (
            <div key={reminder.id} className="reminder-card past">
              <div className="reminder-header">
                <h4>{reminder.title}</h4>
                <button
                  className="icon-btn text-danger"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this reminder?')) {
                      deleteReminder(reminder.id);
                    }
                  }}
                  title="Delete reminder"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p>{reminder.description}</p>
              <p>Target: {formatCurrency(reminder.targetAmount, currency)} by {formatDate(reminder.targetDate)}</p>
              <p>Achieved: {formatCurrency(reminder.currentAmount, currency)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

