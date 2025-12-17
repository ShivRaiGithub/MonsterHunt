import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  username: string | null
  account: string | null
  platform: string | null
  xp: number
  huntTokens: number
  gamesPlayed: number
  wins: {
    villager: number
    doctor: number
    sheriff: number
    werewolf: number
    vampire: number
  }
  monsterGenes: {
    werewolf: boolean
    vampire: boolean
  }
  scenesBought: {
    village: boolean
    castle: boolean
  }
  setUser: (user: Partial<UserState>) => void
  updateXP: (xp: number) => void
  updateHuntTokens: (tokens: number) => void
  clearUser: () => void
}

const initialState = {
  username: null,
  account: null,
  platform: null,
  xp: 0,
  huntTokens: 0,
  gamesPlayed: 0,
  wins: {
    villager: 0,
    doctor: 0,
    sheriff: 0,
    werewolf: 0,
    vampire: 0
  },
  monsterGenes: {
    werewolf: true,
    vampire: false
  },
  scenesBought: {
    village: true,
    castle: false
  }
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      ...initialState,
      setUser: (user: Partial<UserState>) => set((state: UserState) => ({ ...state, ...user })),
      updateXP: (xp: number) => set({ xp }),
      updateHuntTokens: (tokens: number) => set({ huntTokens: tokens }),
      clearUser: () => set(initialState)
    }),
    {
      name: 'user-storage',
    }
  )
)
