import { create } from 'zustand'

interface SocketState {
  socketId: string | null
  setSocketId: (id: string) => void
  clearSocketId: () => void
}

// Generate or retrieve socket ID from sessionStorage (unique per tab)
export const getOrCreateSocketId = () => {
  if (typeof window === 'undefined') return null
  
  let socketId = sessionStorage.getItem('socket_id')
  if (!socketId) {
    socketId = `socket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('socket_id', socketId)
  }
  return socketId
}

export const useSocketStore = create<SocketState>((set) => ({
  socketId: getOrCreateSocketId(),
  setSocketId: (id) => {
    sessionStorage.setItem('socket_id', id)
    set({ socketId: id })
  },
  clearSocketId: () => {
    sessionStorage.removeItem('socket_id')
    set({ socketId: null })
  }
}))
