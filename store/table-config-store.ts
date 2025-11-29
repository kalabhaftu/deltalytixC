import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { VisibilityState, SortingState, ColumnFiltersState } from '@tanstack/react-table'

export interface TableColumnConfig {
  id: string
  title: string
  visible: boolean
  size: number
  order: number
}

export interface TableConfig {
  id: string
  columns: TableColumnConfig[]
  columnVisibility: VisibilityState
  sorting: SortingState
  columnFilters: ColumnFiltersState
  pageSize: number
  pageIndex: number
  groupingGranularity: number
}

interface TableConfigState {
  tables: Record<string, TableConfig>
  // Actions
  setTableConfig: (tableId: string, config: Partial<TableConfig>) => void
  updateColumnVisibility: (tableId: string, columnId: string, visible: boolean) => void
  updateColumnVisibilityState: (tableId: string, visibility: VisibilityState) => void
  updateColumnSize: (tableId: string, columnId: string, size: number) => void
  updateColumnOrder: (tableId: string, columnId: string, order: number) => void
  updateSorting: (tableId: string, sorting: SortingState) => void
  updateColumnFilters: (tableId: string, filters: ColumnFiltersState) => void
  updatePageSize: (tableId: string, pageSize: number) => void
  updatePageIndex: (tableId: string, pageIndex: number) => void
  updateGroupingGranularity: (tableId: string, granularity: number) => void
  resetTableConfig: (tableId: string) => void
  resetAllConfigs: () => void
  migrateOldColumns: () => void
}

// Default configuration for trade table
// Must match actual columns in trade-table-review.tsx
const defaultTradeTableConfig: TableConfig = {
  id: 'trade-table',
  columns: [
    { id: 'select', title: 'Select', visible: true, size: 40, order: 0 },
    { id: 'expand', title: 'Expand', visible: true, size: 40, order: 1 },
    { id: 'accounts', title: 'Accounts', visible: true, size: 120, order: 2 },
    { id: 'tradeDate', title: 'Trade Date', visible: true, size: 120, order: 3 },
    { id: 'instrument', title: 'Instrument', visible: true, size: 120, order: 4 },
    { id: 'direction', title: 'Direction', visible: true, size: 100, order: 5 },
    { id: 'entryPrice', title: 'Entry Price', visible: true, size: 100, order: 6 },
    { id: 'closePrice', title: 'Close Price', visible: true, size: 100, order: 7 },
    { id: 'timeInPosition', title: 'Time in Position', visible: true, size: 120, order: 8 },
    { id: 'pnl', title: 'PnL', visible: true, size: 100, order: 9 },
    { id: 'commission', title: 'Commission', visible: true, size: 100, order: 10 },
    { id: 'quantity', title: 'Quantity', visible: true, size: 100, order: 11 },
    { id: 'actions', title: 'Actions', visible: true, size: 80, order: 12 },
  ],
  columnVisibility: {},
  sorting: [{ id: 'tradeDate', desc: true }],
  columnFilters: [],
  pageSize: 10,
  pageIndex: 0,
  groupingGranularity: 0,
}

export const useTableConfigStore = create<TableConfigState>()(
  persist(
    (set, get) => ({
      tables: {
        'trade-table': defaultTradeTableConfig,
      },

      // Migration function to handle old column references and sync with current table structure
      migrateOldColumns: () => {
        const state = get()
        const tradeTable = state.tables['trade-table']
        
        if (tradeTable) {
          // List of columns that no longer exist in the table
          const removedColumns = ['ticks', 'points', 'ticksAndPoints', 'entryDate', 'entryTime', 'closeDate', 'image', 'tags']
          // List of valid column IDs from the current table
          const validColumnIds = ['select', 'expand', 'accounts', 'tradeDate', 'instrument', 'direction', 'entryPrice', 'closePrice', 'timeInPosition', 'pnl', 'commission', 'quantity', 'actions']
          
          // Check if any old columns exist
          const hasOldColumns = tradeTable.columns.some(col => removedColumns.includes(col.id))
          const hasMissingColumns = !validColumnIds.every(id => tradeTable.columns.some(col => col.id === id))
          
          if (hasOldColumns || hasMissingColumns) {
            // Reset to default config to ensure consistency
            set({
              tables: {
                ...state.tables,
                'trade-table': defaultTradeTableConfig,
              },
            })
          }
        }
      },

      setTableConfig: (tableId, config) => set((state) => ({
        tables: {
          ...state.tables,
          [tableId]: {
            ...state.tables[tableId],
            ...config,
          },
        },
      })),

      updateColumnVisibility: (tableId, columnId, visible) => set((state) => {
        const table = state.tables[tableId]
        if (!table) return state

        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              columns: table.columns.map(col =>
                col.id === columnId ? { ...col, visible } : col
              ),
              columnVisibility: {
                ...table.columnVisibility,
                [columnId]: visible,
              },
            },
          },
        }
      }),

      updateColumnVisibilityState: (tableId, visibility) => set((state) => ({
        tables: {
          ...state.tables,
          [tableId]: {
            ...state.tables[tableId],
            columnVisibility: visibility,
          },
        },
      })),

      updateColumnSize: (tableId, columnId, size) => set((state) => {
        const table = state.tables[tableId]
        if (!table) return state

        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              columns: table.columns.map(col =>
                col.id === columnId ? { ...col, size } : col
              ),
            },
          },
        }
      }),

      updateColumnOrder: (tableId, columnId, order) => set((state) => {
        const table = state.tables[tableId]
        if (!table) return state

        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              columns: table.columns.map(col =>
                col.id === columnId ? { ...col, order } : col
              ),
            },
          },
        }
      }),

      updateSorting: (tableId, sorting) => set((state) => ({
        tables: {
          ...state.tables,
          [tableId]: {
            ...state.tables[tableId],
            sorting,
          },
        },
      })),

      updateColumnFilters: (tableId, filters) => set((state) => ({
        tables: {
          ...state.tables,
          [tableId]: {
            ...state.tables[tableId],
            columnFilters: filters,
          },
        },
      })),

      updatePageSize: (tableId, pageSize) => set((state) => ({
        tables: {
          ...state.tables,
          [tableId]: {
            ...state.tables[tableId],
            pageSize,
          },
        },
      })),

      updatePageIndex: (tableId, pageIndex) => set((state) => ({
        tables: {
          ...state.tables,
          [tableId]: {
            ...state.tables[tableId],
            pageIndex,
          },
        },
      })),

      updateGroupingGranularity: (tableId, granularity) => set((state) => ({
        tables: {
          ...state.tables,
          [tableId]: {
            ...state.tables[tableId],
            groupingGranularity: granularity,
          },
        },
      })),

      resetTableConfig: (tableId) => set((state) => {
        const defaultConfig = tableId === 'trade-table' ? defaultTradeTableConfig : state.tables[tableId]
        return {
          tables: {
            ...state.tables,
            [tableId]: defaultConfig,
          },
        }
      }),

      resetAllConfigs: () => set({
        tables: {
          'trade-table': defaultTradeTableConfig,
        },
      }),
    }),
    {
      name: 'table-config-store',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Run migration after hydration to sync columns with current table structure
        if (state) {
          state.migrateOldColumns()
        }
      },
    }
  )
) 