import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BudgetProvider } from './context/BudgetContext';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import TransactionsList from './components/TransactionsList';
import AccountsManagement from './components/AccountsManagement';
import CategoriesManagement from './components/CategoriesManagement';
import BudgetPlanner from './components/BudgetPlanner';
import CalendarReminders from './components/CalendarReminders';
import Charts from './components/Charts';
import Subscriptions from './components/Subscriptions';
import Settings from './components/Settings';

function App() {
  return (
    <BudgetProvider>
      <Router>
        <div className="app">
          <Navigation />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<TransactionsList />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/accounts" element={<AccountsManagement />} />
              <Route path="/categories" element={<CategoriesManagement />} />
              <Route path="/budget" element={<BudgetPlanner />} />
              <Route path="/reminders" element={<CalendarReminders />} />
              <Route path="/charts" element={<Charts />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </Router>
    </BudgetProvider>
  );
}

export default App;

