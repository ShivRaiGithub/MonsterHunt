"use client"

import { Button } from "@/client/components/ui/button"
import { ScrollArea } from "@/client/components/ui/scroll-area"
import { useGame } from "@/client/contexts/GameContext"
import { MovementPanel } from "@/client/components/MovementPanel"
import { RoleActionsPanel } from "@/client/components/RoleActionsPanel"
import { VotingPanel } from "@/client/components/VotingPanel"
import { WolfReplayPanel } from "@/client/components/MonsterReplayPanel"
import { ChatScreen } from "@/client/components/InMatch/chatScreen"
import { useEffect, useState } from "react"

interface RightPanelProps {
  onBackToLobby: () => void
}

export function RightPanel({ onBackToLobby }: RightPanelProps) {
  const { state } = useGame()
  const [timeLeft, setTimeLeft] = useState(0)

  const handleLeaveRoom = () => {
    // Send leave room event to server
    if (state.socket) {
      state.socket.emit("room:leave")
    }
    onBackToLobby()
  }

  const phase = state.gameState?.phase

  useEffect(() => {
    if (!state.gameState?.phaseStartTime || !state.gameState?.phaseTimer) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.gameState!.phaseStartTime) / 1000)
      const remaining = Math.max(0, state.gameState!.phaseTimer - elapsed)
      setTimeLeft(remaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [state.gameState?.phaseStartTime, state.gameState?.phaseTimer])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getLocationName = (locationId?: number) => {
    if (locationId === undefined) return "Unknown"
    const sceneGraph = state.gameState?.sceneGraph
    if (!sceneGraph?.locations) return `Location ${locationId}`
    return sceneGraph.locations[locationId]?.name || `Location ${locationId}`
  }

  return (
    <div className="h-screen flex flex-col bg-black/30 backdrop-blur-sm">
      <div className="flex-shrink-0 p-4 border-b border-fantasy-gold bg-black/40">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-fantasy-gold">Room: {state.roomId}</h3>
          <Button
            onClick={handleLeaveRoom}
            variant="outline"
            size="sm"
            className="border-fantasy-gold text-fantasy-gold hover:bg-fantasy-gold hover:text-black bg-transparent"
          >
            Leave
          </Button>
        </div>

        {state.gameState?.phase !== "lobby" && state.gameState?.phase !== "ended" && (
          <div className="text-sm text-fantasy-amber mb-2">
            Time Left:{" "}
            <span className={`font-mono ${timeLeft <= 10 ? "text-red-400" : "text-foreground"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        )}

        {state.currentPlayer && (
          <div className="text-sm text-fantasy-amber">
            <div>
              Role: <span className="font-semibold capitalize">{state.currentPlayer.role}</span>
              <span className="ml-2">HP: {state.currentPlayer.health}</span>
              {!state.currentPlayer.isAlive && <span className="text-red-400 ml-2">(Dead)</span>}
            </div>
            <div className="text-xs mt-1">
              Location: {getLocationName(state.currentPlayer.locationId)}
              {state.currentPlayer.isHiding && " (Hiding)"}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {phase === "night" && (
              <>
                <MovementPanel />
                <RoleActionsPanel />
              </>
            )}

            {phase === "day" && (
              <>
                {state.gameState?.gameMode === "huntFury" ? (
                  // In HuntFury mode, show movement and actions during day
                  <>
                    <MovementPanel />
                    <RoleActionsPanel />
                  </>
                ) : (
                  // In Hunt and Discuss mode, show voting and replay
                  <>
                    <VotingPanel />
                    <WolfReplayPanel />
                    <ChatScreen />
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}