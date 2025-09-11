import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CountingUnit } from '@/lib/asset-classification'

interface CountingUnitState {
  userPreference: CountingUnit
  setUserPreference: (unit: CountingUnit) => void
}

export const useCountingUnitStore = create<CountingUnitState>()(
  persist(
    (set) => ({
      userPreference: 'pip', // Default to pip
      setUserPreference: (unit: CountingUnit) => set({ userPreference: unit }),
    }),
    {
      name: 'counting-unit-preference',
    }
  )
)

