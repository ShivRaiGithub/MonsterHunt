"use client"

import { useGame } from "@/contexts/GameContext"

export function ConnectionStatus() {
  const { state } = useGame()

  if (state.isConnected && !state.isReconnecting) return null

  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="bg-black/80 text-white p-3 rounded-lg shadow-lg border border-fantasy-gold">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-fantasy-gold"></div>
          <span className="text-sm">{state.isReconnecting ? "Reconnecting..." : "Connecting to server..."}</span>
        </div>
      </div>
    </div>
  )
}
