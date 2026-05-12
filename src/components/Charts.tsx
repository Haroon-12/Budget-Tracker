import { useBudget } from '../context/BudgetContext';
import { formatCurrency, getTotalExpenses, getTotalSavings, getTotalDebt } from '../utils/helpers';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, PieChart as PieChartIcon } from 'lucide-react';

export default function Charts() {
  const { transactions, categories, accounts, currency } = useBudget();

  const activeTransactions = transactions.filter(t => !t.isVoided);

  // Category-wise expenses
  const categoryExpenses = categories
    .filter(c => c.type === 'expense' || c.type === 'debt')
    .map(category => {
      const total = activeTransactions
        .filter(t => (t.categoryId === category.id || t.subCategoryId === category.id) && (t.type === 'expense' || t.type === 'debt'))
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        name: category.name,
        value: total,
        color: category.color,
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Monthly spending
  const monthlyData = activeTransactions
    .filter(t => t.type === 'expense' || t.type === 'debt')
    .reduce((acc, t) => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[monthKey]) {
        acc[monthKey] = 0;
      }
      acc[monthKey] += t.amount;
      return acc;
    }, {} as Record<string, number>);

  const monthlyChartData = Object.entries(monthlyData)
    .map(([month, value]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      amount: value,
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .slice(-6); // Last 6 months

  // Account balances
  const accountData = accounts.map(acc => ({
    name: acc.name,
    balance: acc.balance,
  }));

  // Income vs Expenses
  const totalIncome = activeTransactions
    .filter(t => t.type === 'income' || t.type === 'savings')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = getTotalExpenses(activeTransactions);
  const totalSavings = getTotalSavings(activeTransactions);
  const totalDebt = getTotalDebt(activeTransactions);

  const incomeExpenseData = [
    { name: 'Income', value: totalIncome, color: '#10b981' },
    { name: 'Expenses', value: totalExpenses, color: '#ef4444' },
    { name: 'Savings', value: totalSavings, color: '#3b82f6' },
    { name: 'Debt', value: totalDebt, color: '#f59e0b' },
  ].filter(item => item.value > 0);

  return (
    <div className="charts-page">
      <h2 className="page-title">Analytics & Charts</h2>

      <div className="charts-grid">
        <div className="chart-card">
          <h3><PieChartIcon size={20} /> Category Breakdown</h3>
          {categoryExpenses.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryExpenses}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryExpenses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-state">No expense data available</p>
          )}
        </div>

        <div className="chart-card">
          <h3><TrendingUp size={20} /> Monthly Spending Trend</h3>
          {monthlyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value, currency)} />
                <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                <Legend />
                <Bar dataKey="amount" fill="#3b82f6" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-state">No monthly data available</p>
          )}
        </div>

        <div className="chart-card">
          <h3>Income vs Expenses Overview</h3>
          {incomeExpenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={incomeExpenseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatCurrency(value, currency)}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {incomeExpenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-state">No financial data available</p>
          )}
        </div>

        <div className="chart-card">
          <h3>Account Balances</h3>
          {accountData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={accountData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                <YAxis dataKey="name" type="category" />
                <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                <Bar dataKey="balance" fill="#10b981" name="Balance" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-state">No account data available</p>
          )}
        </div>
      </div>

      <div className="summary-stats">
        <div className="stat-item">
          <h4>Total Income</h4>
          <p className="stat-value text-success">{formatCurrency(totalIncome, currency)}</p>
        </div>
        <div className="stat-item">
          <h4>Total Expenses</h4>
          <p className="stat-value text-danger">{formatCurrency(totalExpenses, currency)}</p>
        </div>
        <div className="stat-item">
          <h4>Total Savings</h4>
          <p className="stat-value text-success">{formatCurrency(totalSavings, currency)}</p>
        </div>
        <div className="stat-item">
          <h4>Total Debt</h4>
          <p className="stat-value text-warning">{formatCurrency(totalDebt, currency)}</p>
        </div>
      </div>
    </div>
  );
}

