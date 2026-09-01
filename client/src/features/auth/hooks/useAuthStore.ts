import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthStore {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

type PersistedAuthState = Pick<AuthStore, "token">;

export const useAuthStore = create<AuthStore>()(
  persist<AuthStore, [], [], PersistedAuthState>(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      clearToken: () => set({ token: null }),
    }),
    {
      name: "marketplace-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ token }) => ({ token }),
    },
  ),
);
