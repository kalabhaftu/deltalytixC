🎯 PHASE TRANSITION FIX SUMMARY

## Problem:
When Phase 1 was passed during trade import, the evaluation correctly detected it, but the Phase Transition Dialog didn't pop up to allow creating Phase 2.

## Root Cause:
The import-button.tsx only showed a toast notification when a phase was passed, but didn't trigger the PhaseTransitionDialog component.

## Solution:
1. Added PhaseTransitionDialog import to import-button.tsx
2. Added state management for phase transition dialog
3. Enhanced evaluation result to include necessary data (currentPhaseNumber, propFirmName, currentPnL, profitTargetProgress)
4. When evaluation.status === 'passed', the dialog now opens automatically with all required data
5. Dialog properly closes and refreshes data on successful phase transition

## Files Modified:
- app/dashboard/components/import/import-button.tsx (added dialog state and trigger logic)
- server/accounts.ts (enhanced evaluation result with additional data)

## Testing:
Try importing trades that push Phase 1 over the profit target - the Phase Transition Dialog should now pop up automatically! 🚀

