# Budget Tracker

A comprehensive budget and expense tracking application with banking-like transaction history, automatic backups, and full financial management features.

## Features

- 💰 **Complete Transaction History** - Never lose a transaction, full audit trail like banking apps
- 📊 **Visual Charts** - Beautiful charts for expenses, savings, and categories
- 📅 **Calendar & Reminders** - Set financial goals with daily savings calculations
- 🎯 **Budget Planning** - Create budgets with date ranges and daily limits
- ⚠️ **Smart Alerts** - Get notified when daily spending limits are exceeded
- 🏦 **Multiple Accounts** - Track money across different accounts
- 📱 **Responsive Design** - Works perfectly on desktop and mobile
- 💾 **Auto Backup** - Automatic backups ensure your data is always safe
- 📄 **Transaction Statements** - Generate statements like bank statements

## Tech Stack

- React 18 + TypeScript
- Vite (Build Tool)
- Recharts (Visualization)
- date-fns (Date utilities)
- Lucide React (Icons)
- LocalStorage (Data persistence)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Vercel will auto-detect Vite and deploy

Or use Vercel CLI:
```bash
npm i -g vercel
vercel
```

### Netlify

1. Push your code to GitHub
2. Import project in Netlify
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

Or use Netlify CLI:
```bash
npm i -g netlify-cli
netlify deploy --prod
```

### GitHub Pages

Add to `package.json`:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

Then:
```bash
npm install -g gh-pages
npm run deploy
```

### Static Hosting (Any Provider)

1. Build the app: `npm run build`
2. Upload the `dist` folder contents to your hosting provider
3. Configure your server to serve `index.html` for all routes (SPA routing)

## Storage System

The app uses localStorage for data persistence with:
- Automatic backups (keeps last 5)
- Transaction history (never deleted, only voided)
- Balance tracking for statements
- Data export/import functionality

See `STORAGE_SYSTEM.md` for detailed documentation.

## Project Structure

```
src/
  ├── components/     # UI components
  ├── context/        # State management
  ├── types/          # TypeScript types
  ├── utils/          # Utility functions
  ├── App.tsx         # Main app component
  └── main.tsx        # Entry point
```

## License

MIT

