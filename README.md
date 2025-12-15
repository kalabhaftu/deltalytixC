# Deltalytix

Deltalytix is a comprehensive personal trading analytics platform designed to help traders journal, track, and improve their performance. It provides deep insights into trading habits through advanced metrics like the Zella Score, supports multiple account types (Master, Phase, Live), and offers a rich dashboard for data visualization.

> **Note**: This project is a fork of [Deltalytix](https://github.com/hugodemenez/deltalytix/) by Hugo De Menez.

## Features

### 1. Account Management
- **Master Accounts**: Track overall progress across different funding programs or personal accounts.
- **Phase Accounts**: specifically designed for prop firm challenges (Evaluation, Verification, Funded phases).
- **Live Accounts**: Monitor real money trading performance.
- **Linked Accounts**: View and manage multiple accounts in a unified interface.

### 2. Advanced Analytics & Journaling
- **Zella Score**: A proprietary scoring system (0-100) specifically calibrated for trader performance, weighing metrics like Recovery Factor, Win Rate, Profit Factor, and Consistency.
- **Trade Journaling**: Detailed trade entry with support for:
    - Custom tags and strategies.
    - Screenshot attachments.
    - Emotional state tracking.
    - Setup and exit reasoning.
- **Performance Statistics**: comprehensive breakdown of win rates, risk/reward ratios, average win/loss, and more, grouped by execution to handle partial closes correctly.
- **Backtesting Support**: Log and analyze backtested trades alongside live performance.

### 3. Dashboard & Visualization
- **Interactive Charts**: Visualizations for PnL, equity curves, and volume using Recharts and Lightweight Charts.
- **Calendar View**: Monthly performance overview with daily PnL and trade counts.
- **Customizable Widgets**: Tailor the dashboard layout to focus on the metrics that matter most.

### 4. Productivity Tools
- **Daily Notes**: Capture thoughts, market observations, and psychological state for each trading day.
- **Weekly Reviews**: Structured review process to analyze weekly performance against expectations.
- **Notifications**: Alerts for phase transitions, payouts, and system events.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbo)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Shadcn UI, Framer Motion
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **State Management**: Zustand, React Query (TanStack Query)
- **Authentication**: Supabase Auth
- **Utilities**: `date-fns`, `xlsx` (Excel export), `jspdf` (PDF reports)

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or pnpm

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd deltalytixC
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment variables:
    - Copy `.env.example` to `.env` (if available) or ensure you have the required Supabase and Database credentials:
        - `NEXT_PUBLIC_SUPABASE_URL`
        - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
        - `DATABASE_URL`
        - `DIRECT_URL`

4.  Generate Prisma client:
    ```bash
    npx prisma generate
    ```

### Running the App

To run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## License

Personal Use / Proprietary.
