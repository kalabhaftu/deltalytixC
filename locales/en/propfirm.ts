export default {
    propFirm: {
        title: 'Accounts',
        description: 'Manage your accounts and track your performance.',
        card: {
            unnamedAccount: 'Unnamed Account',
            balance: 'Balance',
            target: 'Target',
            remainingToTarget: 'Remaining to Target',
            drawdown: 'Drawdown',
            remainingLoss: '${amount} remaining',
            drawdownBreached: 'Drawdown breached',
            maxLoss: 'Max Loss: ${amount}',
            needsConfiguration: 'Account needs to be configured',
            daysBeforeNextPayment: ' days before next payment',
            consistency: 'Consistency',
            highestDailyProfit: 'Highest Daily Profit',
            maxAllowedDailyProfit: 'Max Allowed Daily Profit',
            totalPnL: 'Total P&L',
            totalTrades: 'Total Trades'
        },
        ungrouped: 'Ungrouped',
        configurator: {
            title: 'Account Configuration for {accountNumber}',
            description: 'Configure the account settings for your prop firm activity',
            template: {
                title: 'Load Template',
                description: 'Quickly load predefined prop firm configurations',
                select: 'Select a template...',
                search: 'Search by prop firm or template...',
                noTemplate: 'No template found.',
                clear: 'Clear Template',
                target: 'Target'
            },
            sections: {
                basicInfo: 'Basic Account Info',
                drawdownRules: 'Drawdown & Trading Rules',
                pricingPayout: 'Pricing & Payout',
                resetDate: 'Reset Date',
                paymentRenewal: 'Payment & Renewal',
                accountReset: 'Account Reset Configuration'
            },
            fields: {
                accountType: 'Account Type',
                funded: 'Funded',
                challenge: 'Challenge',
                drawdown: 'Drawdown',
                drawdownType: 'Drawdown Type',
                trailingDrawdown: 'Trailing Drawdown',
                trailingStopProfit: 'Trailing Stop Profit',
                trailingType: 'Trailing Type',
                dailyLoss: 'Daily Loss',
                rulesDailyLoss: 'Rules Daily Loss',
                tradingNewsAllowed: 'Trading News Allowed',
                allowNewsTrading: 'Allow News Trading',
                price: 'Price',
                basePrice: 'Base Price',
                promo: 'Promo',
                hasPromo: 'Has Promo',
                promoType: 'Promo Type',
                directPrice: 'Direct Price',
                percentage: 'Percentage',
                activationFees: 'Activation Fees',
                balanceRequired: 'Balance Required',
                minTradingDays: 'Min Trading Days for Payout',
                propfirmName: 'Prop Firm Name',
                nextPaymentDate: 'Next Payment Date',
                paymentFrequency: 'Payment Frequency',
                autoRenewal: 'Auto Renewal',
                renewalNotification: 'Renewal Notification',
                enableRenewalNotification: 'Enable renewal notifications',
                renewalNoticeInfo: 'You will receive notifications 3 days before renewal',
                renewalNotice: 'Renewal Notice Days',
                autoAdvanceInfo: '💡 This date will automatically advance based on your {frequency} frequency after each renewal notice.',
                customFrequencyWarning: '⚠️ Custom frequency requires manual date updates'
            },
            trailingTypes: {
                static: 'Static',
                eod: 'End of Day',
                intraday: 'Intraday'
            },
            rulesDailyLoss: {
                no: 'No',
                lock: 'Lock',
                violation: 'Violation'
            },
            paymentFrequencies: {
                monthly: 'Monthly',
                quarterly: 'Quarterly',
                biannual: 'Bi-annual',
                annual: 'Annual',
                custom: 'Custom'
            },
            tooltips: {
                trailingDrawdown: 'Trailing drawdown follows your profits upward but never moves down when you lose money. When enabled with a trailing stop, it stops following profits once you reach the specified profit amount. The calculation can be done intraday (real-time) or end-of-day (computed once daily based on total daily profit/loss).',
                trailingStopProfit: 'Example: If you set $3,000, once you reach $3,000 in profits, the trailing drawdown will stop increasing and lock at that level. This means your stop loss will no longer follow your profits upward beyond this point.'
            },
            placeholders: {
                enterPrice: 'Enter price',
                enterAmountToLockDrawdown: 'Enter amount to lock drawdown',
                selectPaymentFrequency: 'Select payment frequency',
                selectTrailingType: 'Select trailing type',
                noPaymentDateSet: 'No payment date set'
            },
            suggestions: {
                zeroStartingBalance: '💡 Consider setting a starting balance to track your account performance accurately. A zero balance may affect calculations and statistics.'
            }

        },
        balance: 'Balance',
        target: 'Target',
        accountSize: 'Account Size',
        coherence: 'Coherence',
        startingBalance: 'Starting Balance',
        beforeReset: 'Before Reset',
        afterReset: 'After Reset',
        globalPnl: 'Global P&L',
        accountName: 'Account Name',
        resetDate: {
            cleared: 'Reset date has been cleared',
            title: 'Reset Date',
            description: 'Select a date to reset the account balance',
            clear: 'Clear reset date',
            set: 'Set reset date',
            label: 'Reset Date',
            noDate: 'No reset date',
            info: 'The date when the account balance will be reset'
        },
        noResetDate: 'No reset date',
        resetDateDescription: 'The date when the account balance will be reset',
        dailyStats: {
            title: 'Daily Performance',
            date: 'Date',
            pnl: 'P&L',
            balance: 'Balance',
            target: '% of Target',
            status: 'Status',
            payout: 'Payout',
            payoutAmount: 'Payout Amount',
            payoutStatus: 'Payout Status',
            maxAllowed: 'Max Allowed'
        },
        setup: {
            button: 'Setup',
            message: 'Click to setup account',
            success: 'Account updated',
            error: 'Failed to update account',
            validation: {
                required: 'Please fill in all required fields',
                positive: 'All numeric values must be positive'
            },
            configureFirst: {
                title: 'Configuration Required',
                description: 'Please configure your prop firm account to see detailed statistics.'
            },
            saveFirst: {
                title: 'Save Required',
                description: 'Please save your changes to see updated statistics.'
            }
        },
        toast: {
            setupSuccess: 'Account setup successful',
            setupSuccessDescription: 'Your prop firm account has been set up successfully',
            setupError: 'Failed to setup account',
            setupErrorDescription: 'An error occurred while setting up your prop firm account',
            updateSuccess: 'Account updated',
            updateSuccessDescription: 'Your prop firm account has been updated successfully',
            updateError: 'Failed to update',
            updateErrorDescription: 'An error occurred while updating your prop firm account',
            resetDateCleared: 'Reset date cleared',
            resetDateClearedDescription: 'The reset date has been cleared successfully',
            resetDateError: 'Reset date error',
            resetDateErrorDescription: 'An error occurred while updating the reset date',
            validationPositive: 'All numeric values must be positive',
            deleteSuccess: 'Account deleted',
            deleteSuccessDescription: 'The prop firm account has been deleted successfully',
            deleteError: 'Failed to delete account',
            deleteErrorDescription: 'An error occurred while deleting the prop firm account'
        },
        chart: {
            balance: "Balance",
            drawdownLevel: "Drawdown Level",
            profitTarget: "Profit Target",
            tradeNumber: "Trade #{number}",
            balanceAmount: "Balance: ${amount}",
            pnlAmount: "PnL: ${amount}",
            drawdownAmount: "Drawdown Level: ${amount}",
            highestBalance: "Highest Balance: ${amount}",
            startingBalance: "Starting Balance",
            noTrades: "No trades available",
            payout: "Payout",
            payoutAmount: "Payout: ${amount}",
            accountReset: "Account Reset"
        },
        trailingDrawdown: {
            explanation: 'Drawdown will trail profits until this level is reached'
        },
        delete: {
            title: 'Delete Account',
            description: 'Are you sure you want to delete account {account}? This action cannot be undone.',
            success: 'Account deleted successfully',
            successDescription: 'The prop firm account has been deleted',
            error: 'Failed to delete account',
            errorDescription: 'An error occurred while deleting the prop firm account',
            confirm: 'Yes, delete account',
            cancel: 'Cancel'
        },
        renewal: {
            title: 'Account Renewals',
            frequency: 'renewal',
            notification: 'Notifications enabled'
        },
        consistency: {
            title: 'Trading Consistency',
            description: 'Monitor your consistency by ensuring no day exceeds the configured percentage of total profit',
            tooltip: 'A consistent trader should maintain balanced daily profits relative to total profit',
            account: 'Account',
            maxAllowedDailyProfit: 'Maximum Allowed Daily Profit',
            highestDailyProfit: 'Highest Daily Profit',
            status: 'Status',
            insufficientData: 'Insufficient Data',
            consistent: 'Consistent',
            inconsistent: 'Inconsistent (Exceeds Maximum)',
            unprofitable: 'No Profit',
            threshold_settings: {
                title: 'Consistency Threshold',
                description: 'Maximum percentage of total profit allowed in one day',
                currentValue: '{value}% of total profit'
            },
            modal: {
                title: 'Inconsistent Days for Account {account}',
                description: 'Days where profit exceeded maximum allowed daily profit',
                date: 'Date',
                pnl: 'P&L',
                percentageOfTotal: '% of Total Profit'
            }
        },
        reset: {
            title: 'Reset Account',
            reasonPrompt: 'Please provide a reason for resetting this account:',
            success: 'Account Reset Successful',
            successDescription: 'The account has been reset successfully',
            error: 'Reset Failed',
            errorDescription: 'Failed to reset the account. Please try again.',
            confirmation: 'Are you sure you want to reset this account? This action cannot be undone.',
            confirm: 'Yes, Reset Account',
            cancel: 'Cancel'
        },
        breach: {
            title: 'Rule Breach Detected',
            dailyDrawdown: 'Daily drawdown limit exceeded',
            maxDrawdown: 'Maximum drawdown limit exceeded',
            description: 'This account has violated the {breachType} rules and has been marked as failed.',
            amount: 'Breach amount: {amount}',
            threshold: 'Limit was: {threshold}',
            timestamp: 'Occurred at: {timestamp}'
        },
        // New Evaluation System Translations
        dashboard: {
            title: 'Prop Firm Dashboard',
            subtitle: 'Manage your evaluation accounts and track progress'
        },
        metrics: {
            totalAccounts: 'Total Accounts',
            totalEquity: 'Total Equity',
            fundedAccounts: 'Funded Accounts',
            accountsAtRisk: 'Accounts at Risk',
            acrossAllAccounts: 'across all accounts',
            successRate: 'success rate',
            needsAttention: 'need attention',
            balance: 'Balance',
            equity: 'Equity',
            unrealizedPnl: 'Unrealized P&L',
            profitTarget: 'Profit Target',
            dailyDrawdown: 'Daily DD Remaining',
            maxDrawdown: 'Max DD Remaining',
            trades: 'trades',
            payouts: 'payouts'
        },
        status: {
            active: 'Active',
            failed: 'Failed',
            pending: 'Pending',
            passed: 'Passed',
            funded: 'Funded',
            challenge: 'Challenge',
            evaluation: 'Evaluation',
            consistent: 'Consistent',
            inconsistent: 'Inconsistent',
            unprofitable: 'Unprofitable',
            needsConfiguration: 'Needs Configuration'
        },
        phase: {
            phase_1: 'Phase 1',
            phase_2: 'Phase 2',
            funded: 'Funded',
            challenge: 'Challenge',
            verification: 'Verification', 
            evaluation: 'Evaluation',
            phase1: 'Phase 1',
            phase2: 'Phase 2',
            active: 'Active'
        },
        tabs: {
            all: 'All',
            active: 'Active',
            funded: 'Funded',
            failed: 'Failed'
        },
        accounts: {
            title: 'Accounts',
            empty: {
                title: 'No Accounts Yet',
                description: 'Create your first prop firm evaluation account to start tracking your progress.'
            }
        },
        account: {
            create: 'Create Account',
            number: 'Account Number',
            name: 'Account Name',
            namePlaceholder: 'Optional display name',
            numberDescription: 'Your prop firm account number',
            nameDescription: 'Optional friendly name for the account',
            propfirm: 'Prop Firm',
            selectPropfirm: 'Select prop firm',
            startingBalance: 'Starting Balance',
            startingBalanceDescription: 'Initial account balance in USD',
            timezone: 'Timezone',
            dailyResetTime: 'Daily Reset Time',
            dailyResetTimeDescription: 'Time when daily drawdown resets',
            reset: 'Reset Account',
            basicInfo: 'Basic Information',
            drawdownLimits: 'Drawdown Limits',
            evaluationSettings: 'Evaluation Settings',
            steps: {
                basic: 'Basic Info',
                basicDescription: 'Account details and prop firm information',
                drawdown: 'Drawdown Rules',
                drawdownDescription: 'Configure daily and maximum drawdown limits',
                evaluation: 'Evaluation',
                evaluationDescription: 'Set evaluation type and profit targets',
                review: 'Review',
                reviewDescription: 'Review and confirm account configuration'
            }
        },
        drawdown: {
            daily: {
                title: 'Daily Drawdown'
            },
            max: {
                title: 'Maximum Drawdown'
            },
            type: 'Type',
            percent: 'Percentage',
            absolute: 'Fixed Amount',
            percentage: 'Percentage (%)',
            amount: 'Amount ($)',
            calculated: 'Calculated',
            mode: 'Mode',
            static: 'Static',
            trailing: 'Trailing',
            staticDescription: 'Fixed from starting balance',
            trailingDescription: 'Follows highest equity achieved'
        },
        evaluation: {
            type: 'Evaluation Type',
            oneStep: 'One Step',
            twoStep: 'Two Step',
            oneStepDescription: 'Direct to funded after reaching profit target',
            twoStepDescription: 'Phase 1, then Phase 2, then funded',
            profitTarget: 'Phase 1 Profit Target',
            profitTargetDescription: 'Target profit for Phase 1 (USD)',
            phase1Target: 'Phase 1 Target'
        },
        trade: {
            add: 'Add Trade',
            new: {
                title: 'Add New Trade',
                description: 'Enter the trade information below',
                backToTrades: 'Back to Trades',
                accountInfo: 'Account Information',
                accountInfoDescription: 'Current account status and phase details',
                accountNumber: 'Account Number',
                status: 'Status',
                currentPhase: 'Current Phase',
                noActivePhase: 'No active phase',
                tradeDetails: 'Trade Details',
                basicInfo: 'Basic Trade Info',
                pricing: 'Pricing',
                timing: 'Timing',
                fees: 'Fees',
                notes: 'Notes',
                submit: 'Create Trade',
                creating: 'Creating...',
                cancel: 'Cancel',
                loading: 'Loading account details...',
                accountNotFound: 'Account Not Found',
                accountNotFoundDescription: 'The requested account could not be found.',
                goBack: 'Go Back',
                success: 'Trade created successfully',
                successDescription: 'Trade for {symbol} has been added to your account',
                error: 'Failed to create trade',
                errorDescription: 'An error occurred while creating the trade',
                fetchError: 'Failed to fetch account details',
                fetchErrorDescription: 'An error occurred while fetching account details'
            },
            form: {
                symbol: 'Symbol',
                symbolRequired: 'Symbol is required',
                symbolInvalid: 'Symbol contains invalid characters',
                side: 'Side',
                sideLong: 'Long',
                sideShort: 'Short',
                quantity: 'Quantity',
                quantityRequired: 'Quantity must be at least 1',
                entryPrice: 'Entry Price',
                entryPriceRequired: 'Entry price must be greater than 0',
                exitPrice: 'Exit Price (optional)',
                exitPriceRequired: 'Exit price must be greater than 0',
                entryTime: 'Entry Time',
                entryTimeRequired: 'Entry time is required',
                exitTime: 'Exit Time (optional)',
                strategy: 'Strategy',
                fees: 'Fees',
                commission: 'Commission',
                comment: 'Notes',
                commentPlaceholder: 'Add any notes about this trade...'
            },
            placeholders: {
                symbol: 'e.g., EURUSD, SPY',
                quantity: 'e.g., 100',
                entryPrice: 'e.g., 1.23456',
                exitPrice: 'e.g., 1.24567',
                strategy: 'e.g., Scalping, Swing',
                fees: 'e.g., 2.50',
                commission: 'e.g., 1.00'
            }
        },
        payout: {
            request: 'Request Payout',
            nextEligible: 'Next payout eligible',
            add: 'Add Payout',
            edit: 'Edit Payout',
            addDescription: 'Add a new payout for account',
            editDescription: 'Edit payout for account',
            amount: 'Amount',
            date: 'Date',
            status: 'Status',
            delete: 'Delete',
            update: 'Update',
            save: 'Save',
            success: 'Payout added successfully',
            successDescription: 'The payout has been added to your account',
            updateSuccess: 'Payout updated successfully',
            updateSuccessDescription: 'The payout has been updated successfully',
            error: 'Failed to add payout',
            errorDescription: 'An error occurred while adding the payout',
            deleteSuccess: 'Payout deleted successfully',
            deleteSuccessDescription: 'The payout has been deleted successfully',
            deleteError: 'Failed to delete payout',
            deleteErrorDescription: 'An error occurred while deleting the payout',
            statuses: {
                pending: 'Pending',
                validated: 'Validated',
                refused: 'Refused',
                paid: 'Paid'
            }
        },
        warnings: {
            approachingLimits: 'Approaching drawdown limits'
        },
        alerts: {
            accountsAtRisk: '{count} account(s) are approaching drawdown limits'
        },
        table: {
            title: 'Table',
            configurator: 'Configurator',
            account: 'Account',
            status: 'Status',
            phase: 'Phase',
            balance: 'Balance',
            equity: 'Equity',
            progress: 'Progress',
            dailyDD: 'Daily DD',
            maxDD: 'Max DD',
            noAccounts: 'No accounts found'
        },
        common: {
            viewMode: {
                cards: 'Cards',
                table: 'Table'
            },
            refresh: 'Refresh',
            delete: 'Delete',
            deleting: 'Deleting...',
            cancel: 'Cancel'
        }
    }
} as const;