import csv
from datetime import datetime
import sys

# Configuration
ACCOUNT_SIZE = 5000
DAILY_DD_PERCENT = 4
DAILY_LIMIT = ACCOUNT_SIZE * (DAILY_DD_PERCENT / 100) # 200

# CSV Path
CSV_PATH = '/home/slimshady/Documents/Project/deltalytixC/test.csv'

def parse_date(date_str):
    # Format: 24/12/2025 13:21:00
    # Assuming the CSV time is already somewhat localized or UTC.
    # The code uses 'UTC' timezone for grouping. 
    # Let's assume the CSV export time is what should be used (server time).
    # We will just take the date part (DD/MM/YYYY) and reformat to YYYY-MM-DD for sorting.
    dt = datetime.strptime(date_str, "%d/%m/%Y %H:%M:%S")
    return dt.strftime("%Y-%m-%d")

def analyze_csv():
    trades_by_day = {}
    
    try:
        with open(CSV_PATH, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['ID'] == 'Total': continue # Skip total row
                
                close_time_str = row['Close Time']
                if not close_time_str: continue

                day_str = parse_date(close_time_str)
                
                # Parse floats
                profit = float(row['Profit'] or 0)
                commission = float(row['Commission'] or 0)
                swap = float(row['Swap'] or 0)
                
                # Net PnL Calculation
                # The web code: netPnl = (trade.pnl || 0) + (trade.commission || 0)
                # It doesn't explicitly add swap in the snippet I saw, but usually PnL includes swap or swap is separate.
                # Standard Prop Firm calc: Net PnL = Gross Profit + Commission + Swap
                net_pnl = profit + commission + swap
                
                if day_str not in trades_by_day:
                    trades_by_day[day_str] = []
                
                trades_by_day[day_str].append({
                    'id': row['ID'],
                    'net_pnl': net_pnl,
                    'time': close_time_str
                })
                
        # Analyze Days
        sorted_days = sorted(trades_by_day.keys())
        running_balance = ACCOUNT_SIZE
        
        print(f"Analysis Config:")
        print(f"Account Size: ${ACCOUNT_SIZE}")
        print(f"Daily Drawdown Limit: ${DAILY_LIMIT} ({DAILY_DD_PERCENT}%)")
        print("-" * 50)
        
        violation_found = False
        
        for day in sorted_days:
            day_trades = trades_by_day[day]
            day_pnl = sum(t['net_pnl'] for t in day_trades)
            day_start_balance = running_balance
            day_end_balance = day_start_balance + day_pnl
            
            # Logic from code: dayLoss = dayPnL < 0 ? Math.abs(dayPnL) : 0
            day_loss = abs(day_pnl) if day_pnl < 0 else 0
            
            is_breached = day_loss > DAILY_LIMIT
            
            status = "VIOLATION" if is_breached else "OK"
            
            print(f"Date: {day}")
            print(f"  Start Balance: ${day_start_balance:.2f}")
            print(f"  Net PnL: ${day_pnl:.2f} ({len(day_trades)} trades)")
            print(f"  Day Loss: ${day_loss:.2f}")
            print(f"  Status: {status}")
            
            if is_breached:
                violation_found = True
                print(f"  !!! DAILY DROPDOWN LIMIT EXCEEDED BY ${day_loss - DAILY_LIMIT:.2f} !!!")
            
            running_balance = day_end_balance
            print("-" * 20)

        # Max Drawdown Check
        # Logic: Max Drawdown Base is 5000 (Static) for Maven Phase 1/2?
        # prop-firm-templates.json says "maxDrawdownType": "static" for Maven.
        # Limit: 8% of 5000 = 400.
        MAX_DD_LIMIT = ACCOUNT_SIZE * 0.08
        lowest_equity = 5000 # Since we only have closed trades, we check balance dips?
        # Code checks: maxDrawdownUsed > maxDrawdownLimit
        # maxDrawdownUsed = maxDrawdownBase (5000) - currentEquity
        # So essentially if Equity < 4600.
        
        print("\nMax Drawdown Analysis (Balance Only):")
        # Re-simulating balance
        curr_bal = ACCOUNT_SIZE
        min_bal = ACCOUNT_SIZE
        for day in sorted_days:
            day_trades = trades_by_day[day]
            for t in day_trades: # Need intra-day order? Code grouped by day for daily check.
                # For Max DD, the code checks strictly at the point of evaluation using currentEquity.
                # But for historical, it only checked daily DD in the helper function I read.
                pass
            
            # Code snippet I read only implemented 'checkHistoricalDailyDrawdowns'.
            # It did NOT show a 'checkHistoricalMaxDrawdown'.
            # However, I should check it manually.
            day_pnl = sum(t['net_pnl'] for t in day_trades)
            curr_bal += day_pnl
            if curr_bal < min_bal: min_bal = curr_bal
            
        max_dd_used = ACCOUNT_SIZE - min_bal
        print(f"Lowest Balance: ${min_bal:.2f}")
        print(f"Max Drawdown Used: ${max_dd_used:.2f}")
        print(f"Max Limit: ${MAX_DD_LIMIT:.2f}")
        
        if max_dd_used > MAX_DD_LIMIT:
             print(f"  !!! MAX DRAWDOWN LIMIT EXCEEDED BY ${max_dd_used - MAX_DD_LIMIT:.2f} !!!")
             violation_found = True
        else:
             print("  Max Drawdown Status: OK")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_csv()
