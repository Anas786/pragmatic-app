import { IUser } from 'src/types';
import { create } from 'zustand';

type UserStore = {
  user: IUser | null;
  setUser: (user: IUser) => void;
  removeUser: () => void;
};

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  removeUser: () => set({ user: null }),
}));
