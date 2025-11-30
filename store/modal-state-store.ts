import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface ModalStateState {
}

export const useModalStateStore = create<ModalStateState>()(
  persist(
    (set) => ({}),
    {
      name: "modal-state-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
) 