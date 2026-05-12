import { useBudget } from '../context/BudgetContext';
import { RecurringSubscription } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Trash2, Calendar, Pause, Play } from 'lucide-react';

export default function Subscriptions() {
  const { recurringSubscriptions, accounts, categories, currency, deleteRecurringSubscription, updateRecurringSubscription } = useBudget();

  const activeSubscriptions = recurringSubscriptions.filter(s => s.isActive);
  const inactiveSubscriptions = recurringSubscriptions.filter(s => !s.isActive);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this subscription? This will also remove all future recurring transactions.')) {
      deleteRecurringSubscription(id);
    }
  };

  const handleToggleActive = (subscription: RecurringSubscription) => {
    updateRecurringSubscription({
      ...subscription,
      isActive: !subscription.isActive,
    });
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account?.name || 'Unknown';
  };

  const getNextDueDate = (subscription: RecurringSubscription) => {
    const startDate = new Date(subscription.startDate);
    const lastProcessed = subscription.lastProcessedDate ? new Date(subscription.lastProcessedDate) : startDate;
    const today = new Date();

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

    return nextDate;
  };

  return (
    <div className="subscriptions-page">
      <div>
        <h2 className="page-title">Subscriptions & Recurring Expenses</h2>
        <p className="page-subtitle">Add a recurring expense from the Transactions page when adding a new expense</p>
      </div>

      <div className="subscriptions-section">
        <h3>Active Subscriptions</h3>
        {activeSubscriptions.length === 0 ? (
          <p className="empty-state">No active subscriptions. Add one to track recurring expenses!</p>
        ) : (
          <div className="subscriptions-grid">
            {activeSubscriptions.map(subscription => {
              const nextDue = getNextDueDate(subscription);
              return (
                <div key={subscription.id} className="subscription-card">
                  <div className="subscription-header">
                    <div>
                      <h4>{subscription.name}</h4>
                      <p className="subscription-amount">{formatCurrency(subscription.amount, currency)}</p>
                    </div>
                    <div className="subscription-actions">
                      <button
                        className="icon-btn"
                        onClick={() => handleToggleActive(subscription)}
                        title="Pause subscription"
                      >
                        <Pause size={16} />
                      </button>
                      <button
                        className="icon-btn text-danger"
                        onClick={() => handleDelete(subscription.id)}
                        title="Delete subscription"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="subscription-details">
                    <p><strong>Frequency:</strong> {subscription.type.charAt(0).toUpperCase() + subscription.type.slice(1)}</p>
                    <p><strong>Category:</strong> {getCategoryName(subscription.categoryId)}</p>
                    <p><strong>Account:</strong> {getAccountName(subscription.accountId)}</p>
                    <p><strong>Started:</strong> {formatDate(subscription.startDate)}</p>
                    <p className="next-due">
                      <Calendar size={16} />
                      <strong>Next Due:</strong> {formatDate(nextDue.toISOString())}
                    </p>
                    {subscription.description && (
                      <p className="subscription-description">{subscription.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {inactiveSubscriptions.length > 0 && (
        <div className="subscriptions-section">
          <h3>Paused Subscriptions</h3>
          <div className="subscriptions-grid">
            {inactiveSubscriptions.map(subscription => (
              <div key={subscription.id} className="subscription-card inactive">
                <div className="subscription-header">
                  <div>
                    <h4>{subscription.name}</h4>
                    <p className="subscription-amount">{formatCurrency(subscription.amount, currency)}</p>
                  </div>
                  <div className="subscription-actions">
                    <button
                      className="icon-btn text-success"
                      onClick={() => handleToggleActive(subscription)}
                      title="Resume subscription"
                    >
                      <Play size={16} />
                    </button>
                    <button
                      className="icon-btn text-danger"
                      onClick={() => handleDelete(subscription.id)}
                      title="Delete subscription"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="subscription-details">
                  <p><strong>Frequency:</strong> {subscription.type.charAt(0).toUpperCase() + subscription.type.slice(1)}</p>
                  <p><strong>Category:</strong> {getCategoryName(subscription.categoryId)}</p>
                  <p><strong>Status:</strong> <span className="badge badge-warning">Paused</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

