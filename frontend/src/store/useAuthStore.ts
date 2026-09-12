import { create } from "zustand";

interface User {
  id: string;
  name: string;
  role: "retailer" | "distributor";
  avatar?: string;
  profile_id?: string;
  profile_complete?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  login: (user: User) => void;
  logout: () => void;
  setHydrating: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isHydrating: true, // Default to true until AuthProvider checks it
  login: (user) => set({ user, isAuthenticated: true, isHydrating: false }),
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
    set({ user: null, isAuthenticated: false, isHydrating: false });
  },
  setHydrating: (state) => set({ isHydrating: state }),
}));
