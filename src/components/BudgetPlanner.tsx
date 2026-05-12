import { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/helpers';
import { Plus, Calendar, DollarSign, Trash2 } from 'lucide-react';

export default function BudgetPlanner() {
  const { budgets, createBudget, deleteBudget, accounts, currency, dispatch } = useBudget();
  const [showForm, setShowForm] = useState(false);
  const [useTotalBalance, setUseTotalBalance] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    totalAmount: 0,
    dailyLimit: 0,
    categoryAllocations: [] as Array<{ categoryId: string; amount: number }>,
  });

  const activeBudgets = budgets.filter(b => b.isActive);
  const inactiveBudgets = budgets.filter(b => !b.isActive);

  const calculateDays = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const days = calculateDays();
    
    // Check if budget already exists for this month
    const startDate = new Date(formData.startDate);
    const existingBudgetForMonth = budgets.find((b) => {
      const bStartDate = new Date(b.startDate);
      return (
        bStartDate.getFullYear() === startDate.getFullYear() &&
        bStartDate.getMonth() === startDate.getMonth() &&
        b.isActive
      );
    });

    if (existingBudgetForMonth) {
      alert('A budget already exists for this month. Please delete the existing budget first or select a different month.');
      return;
    }

    // Calculate total budget from main account (checking) balance if useTotalBalance is true
    const mainAccount = accounts.find(a => a.type === 'checking');
    const mainAccountBalance = mainAccount?.balance || 0;
    const budgetAmount = useTotalBalance ? mainAccountBalance : formData.totalAmount;
    const calculatedDailyLimit = days > 0 ? budgetAmount / days : 0;

    createBudget({
      name: formData.name,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      totalAmount: budgetAmount,
      dailyLimit: formData.dailyLimit || calculatedDailyLimit,
      categories: formData.categoryAllocations.map(ca => ({
        categoryId: ca.categoryId,
        allocatedAmount: ca.amount,
        spentAmount: 0,
      })),
      isActive: true,
      useTotalBalance: useTotalBalance,
    });

    setFormData({
      name: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      totalAmount: 0,
      dailyLimit: 0,
      categoryAllocations: [],
    });
    setShowForm(false);
  };

  const handleContinueBudget = (budgetId: string) => {
    const budget = budgets.find(b => b.id === budgetId);
    if (budget && confirm('Do you want to continue this budget plan for the next month?')) {
      const nextStart = new Date(budget.endDate);
      nextStart.setDate(nextStart.getDate() + 1);
      const nextEnd = new Date(nextStart);
      nextEnd.setMonth(nextEnd.getMonth() + 1);
      const days = Math.ceil((nextEnd.getTime() - nextStart.getTime()) / (1000 * 60 * 60 * 24));

      createBudget({
        name: `${budget.name} (Continued)`,
        startDate: nextStart.toISOString(),
        endDate: nextEnd.toISOString(),
        totalAmount: budget.totalAmount,
        dailyLimit: budget.totalAmount / days,
        categories: budget.categories.map(c => ({
          categoryId: c.categoryId,
          allocatedAmount: c.allocatedAmount,
          spentAmount: 0,
        })),
        isActive: true,
      });

      dispatch({ type: 'UPDATE_BUDGET', payload: { ...budget, isActive: false } });
    }
  };

  return (
    <div className="budget-planner">
      <div className="page-header">
        <h2 className="page-title">Budget Planning</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Create Budget
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3>Create New Budget</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label>Budget Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., January 2024 Budget"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label><Calendar size={16} /> Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label><Calendar size={16} /> End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate}
                  required
                />
              </div>
            </div>

            {calculateDays() > 0 && (
              <div className="info-box">
                <p>Budget Period: {calculateDays()} days</p>
              </div>
            )}

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={useTotalBalance}
                  onChange={(e) => {
                    setUseTotalBalance(e.target.checked);
                    if (e.target.checked) {
                      const mainAccount = accounts.find(a => a.type === 'checking');
                      const mainAccountBalance = mainAccount?.balance || 0;
                      const days = calculateDays();
                      const dailyLimit = days > 0 ? mainAccountBalance / days : 0;
                      setFormData({ ...formData, totalAmount: mainAccountBalance, dailyLimit });
                    }
                  }}
                />
                Use total balance from main account as budget amount
              </label>
              <p className="form-hint">
                Current main account balance: {formatCurrency(accounts.find(a => a.type === 'checking')?.balance || 0, currency)}
              </p>
            </div>

            <div className="form-group">
              <label><DollarSign size={16} /> Total Budget Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.totalAmount}
                onChange={(e) => {
                  const amount = parseFloat(e.target.value) || 0;
                  const days = calculateDays();
                  const dailyLimit = days > 0 ? amount / days : 0;
                  setFormData({ ...formData, totalAmount: amount, dailyLimit });
                }}
                disabled={useTotalBalance}
                required
              />
              {useTotalBalance && (
                <p className="form-hint">
                  Budget amount is automatically set to the main account (checking) balance
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Daily Spending Limit (auto-calculated)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.dailyLimit.toFixed(2)}
                onChange={(e) => setFormData({ ...formData, dailyLimit: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create Budget
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="budgets-section">
        <h3>Active Budgets</h3>
        {activeBudgets.length === 0 ? (
          <p className="empty-state">No active budgets. Create one to get started!</p>
        ) : (
          activeBudgets.map(budget => {
            const endDate = new Date(budget.endDate);
            const isEndingSoon = endDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const isExpired = endDate < new Date();

            return (
              <div key={budget.id} className={`budget-card ${isExpired ? 'expired' : ''} ${isEndingSoon ? 'ending-soon' : ''}`}>
                <div className="budget-header">
                  <h4>{budget.name}</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {isExpired && <span className="badge badge-warning">Expired</span>}
                    {isEndingSoon && !isExpired && <span className="badge badge-info">Ending Soon</span>}
                    <button
                      className="icon-btn text-danger"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this budget?')) {
                          deleteBudget(budget.id);
                        }
                      }}
                      title="Delete budget"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="budget-details">
                  <p><strong>Period:</strong> {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}</p>
                  <p><strong>Total Budget:</strong> {formatCurrency(budget.totalAmount, currency)}</p>
                  <p><strong>Daily Limit:</strong> {formatCurrency(budget.dailyLimit, currency)}</p>
                </div>
                {isExpired && (
                  <div className="budget-actions">
                    <button className="btn-secondary" onClick={() => handleContinueBudget(budget.id)}>
                      Continue for Next Month
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {inactiveBudgets.length > 0 && (
        <div className="budgets-section">
          <h3>Past Budgets</h3>
          {inactiveBudgets.map(budget => (
            <div key={budget.id} className="budget-card">
              <div className="budget-header">
                <h4>{budget.name}</h4>
                <button
                  className="icon-btn text-danger"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this budget?')) {
                      deleteBudget(budget.id);
                    }
                  }}
                  title="Delete budget"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p><strong>Period:</strong> {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}</p>
              <p><strong>Total Budget:</strong> {formatCurrency(budget.totalAmount, currency)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

