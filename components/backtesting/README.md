# Backtesting Components

A comprehensive set of React components for displaying backtesting analytics, designed to match your dashboard's theme and styling patterns.

## Components

### 1. StatsCard
Displays key metrics with proper formatting and color coding.

```tsx
import { StatsCard } from '@/components/backtesting'

<StatsCard
  title="Net P&L"
  value={191266.47}
  positive={true}
  tooltip="Total profit or loss from all trades"
/>
```

### 2. DonutChart
Shows winning percentage as a donut chart with legend.

```tsx
import { DonutChart } from '@/components/backtesting'

<DonutChart
  title="Winning % By Trades"
  percentage={63.0}
  winCount={19}
  lossCount={11}
  tooltip="Breakdown of winning vs losing trades"
/>
```

### 3. RadarChartComponent
Displays Zella score with radar chart visualization.

```tsx
import { RadarChartComponent } from '@/components/backtesting'

<RadarChartComponent
  zellaScore={90.93}
  metrics={{
    winRate: 54.27,
    profitFactor: 2.75,
    avgWinLoss: 0.95,
    recoveryFactor: 12.75,
    maxDrawdown: 15000,
    consistency: 85.3
  }}
  tooltip="Comprehensive performance score"
/>
```

### 4. CalendarView
Monthly calendar view with daily P&L and weekly summaries.

```tsx
import { CalendarView } from '@/components/backtesting'

<CalendarView
  calendarData={calendarData}
  monthlyStats={{
    totalPnl: 16200,
    totalDays: 16
  }}
/>
```

### 5. BacktestingDashboard
Complete dashboard that combines all components.

```tsx
import { BacktestingDashboard } from '@/components/backtesting'
import { sampleBacktestingData } from '@/components/backtesting/demo-data'

<BacktestingDashboard data={sampleBacktestingData} />
```

## Data Structure

The components expect data in the following format:

```typescript
interface BacktestingData {
  stats: BacktestingStats
  calendarData: BacktestingCalendarData
  zellaMetrics: ZellaScoreMetrics
}
```

See `types/backtesting.ts` for complete type definitions.

## Demo

Visit `/backtesting-demo` to see all components in action with sample data.

## Features

- **Theme Integration**: Fully integrated with your existing theme system (light/dark mode)
- **Responsive Design**: Works on desktop and mobile devices
- **Tooltips**: Helpful explanations for all metrics
- **Color Coding**: Consistent green/red color scheme for profits/losses
- **Interactive Calendar**: Navigate between months with weekly summaries
- **Performance Optimized**: Uses memoization and proper React patterns

## Styling

All components use your existing design system:
- Colors from CSS variables (--chart-1, --chart-2, etc.)
- Consistent card styling with shadows and borders
- Proper spacing and typography
- Responsive grid layouts
