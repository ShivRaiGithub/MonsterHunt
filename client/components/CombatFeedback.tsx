"use client"
import { useGame } from "@/contexts/GameContext"

export function CombatFeedback() {
  const { state } = useGame()

  if (!state.combatFeedback) return null

  const attacker = state.gameState?.players[state.combatFeedback.attacker]
  const target = state.gameState?.players[state.combatFeedback.target]

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <div
        className="bg-fantasy-crimson/90 text-white p-3 rounded-lg shadow-lg animate-in slide-in-from-right-5 fade-in duration-300"
      >
        <div className="text-sm font-semibold">
          {attacker?.name} attacked {target?.name}!
        </div>
        <div className="text-xs">
          Damage: {state.combatFeedback.damage} {state.combatFeedback.killed && "- KILLED!"}
        </div>
      </div>
    </div>
  )
}
