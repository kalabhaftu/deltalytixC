import csv
from datetime import datetime
import sys

# Configuration
ACCOUNT_SIZE = 5000
DAILY_DD_PERCENT = 4
DAILY_LIMIT = ACCOUNT_SIZE * (DAILY_DD_PERCENT / 100) # 200

# CSV Path
CSV_PATH = '/home/slimshady/Documents/Project/deltalytixC/test.csv'

def parse_datetime(date_str):
    # Format: 24/12/2025 13:21:00
    try:
        return datetime.strptime(date_str, "%d/%m/%Y %H:%M:%S")
    except ValueError:
        return None

def analyze_csv():
    all_trades = []
    
    try:
        with open(CSV_PATH, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['ID'] == 'Total': continue
                
                close_time_str = row['Close Time']
                if not close_time_str: continue

                dt = parse_datetime(close_time_str)
                if not dt: continue
                
                # Parse floats
                profit = float(row['Profit'] or 0)
                commission = float(row['Commission'] or 0)
                swap = float(row['Swap'] or 0)
                net_pnl = profit + commission + swap
                
                all_trades.append({
                    'dt': dt,
                    'date_str': dt.strftime("%Y-%m-%d"),
                    'net_pnl': net_pnl,
                    'id': row['ID']
                })
        
        # Sort ALL trades chronologically
        all_trades.sort(key=lambda x: x['dt'])
        
        # --- Daily Drawdown Analysis ---
        print(f"Analysis Config:")
        print(f"Account Size: ${ACCOUNT_SIZE}")
        print(f"Daily Drawdown Limit: ${DAILY_LIMIT} ({DAILY_DD_PERCENT}%)")
        print("-" * 50)
        
        trades_by_day = {}
        for t in all_trades:
            d = t['date_str']
            if d not in trades_by_day: trades_by_day[d] = []
            trades_by_day[d].append(t)
            
        violation_found = False
        running_balance = ACCOUNT_SIZE
        
        # For Max Drawdown (Balance Based)
        min_balance = ACCOUNT_SIZE 
        current_balance = ACCOUNT_SIZE
        max_dd_violation = False
        
        # Iterate day by day for Daily Check
        # Iterate trade by trade for Max Check
        
        for trade in all_trades:
            current_balance += trade['net_pnl']
            if current_balance < min_balance:
                min_balance = current_balance
                
        # Now Check Daily
        sorted_days = sorted(trades_by_day.keys())
        daily_vol_balance = ACCOUNT_SIZE
        
        for day in sorted_days:
            day_trades = trades_by_day[day]
            day_pnl = sum(t['net_pnl'] for t in day_trades)
            day_loss = abs(day_pnl) if day_pnl < 0 else 0
            
            is_breached = day_loss > DAILY_LIMIT
            
            print(f"Date: {day}")
            print(f"  Net PnL: ${day_pnl:.2f}")
            print(f"  Day Loss: ${day_loss:.2f}")
            if is_breached:
                print(f"  !!! DAILY LIMIT EXCEEDED !!!")
                violation_found = True
            print("-" * 20)
            
            daily_vol_balance += day_pnl

        # Max Drawdown Result
        max_dd_used = ACCOUNT_SIZE - min_balance
        MAX_DD_LIMIT = ACCOUNT_SIZE * 0.08
        
        print("\nMax Drawdown Analysis (Balance High-Low):")
        print(f"Lowest Balance Reached: ${min_balance:.2f}")
        print(f"Max Drawdown Used: ${max_dd_used:.2f}")
        print(f"Limit: ${MAX_DD_LIMIT:.2f}")
        
        if max_dd_used > MAX_DD_LIMIT:
             print(f"  !!! MAX DRAWDOWN LIMIT EXCEEDED !!!")
             violation_found = True
        else:
             print("  Status: OK")
             
        if not violation_found:
            print("\nVERDICT: NO VIOLATIONS FOUND")
        else:
            print("\nVERDICT: VIOLATION DETECTED")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_csv()
