// LobbyView.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/client/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card"
import { useGame } from "@/client/contexts/GameContext"
import type { Player, GameMode } from "../../types/game"

interface LobbyViewProps {
  onGameStart: () => void
  initialMode?: GameMode
  initialName?: string
  initialRoomId?: string | null
}

export function LobbyView({ onGameStart, initialMode, initialName, initialRoomId }: LobbyViewProps) {
  const router = useRouter()
  const { state, actions } = useGame()
  const socket = state.socket
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    if (state.roomId && state.gameState && state.gameState.hasStarted) {
      setIsStarting(false)
      onGameStart()
    }
  }, [state.roomId, state.gameState, onGameStart])

  // Auto-create room on mount (single Play flow)
  useEffect(() => {
    if (!socket || !initialName || state.roomId || !initialMode) return

    // Always create a new room with the Play flow
    actions.createRoom(initialName, initialMode)
  }, [socket, initialName, initialMode, state.roomId, actions])

  const handleStartGame = () => {
    setIsStarting(true)
    ;(actions as any).startGame()
  }

  // Show loading while connecting
  if (!state.roomId || !state.gameState) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{
          backgroundImage: "url('/images/wolf.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* darkening overlay (kept lower than fog via CSS .page-bg-overlay) */}
        <div className="page-bg-overlay pointer-events-none" />

        <Card className="relative z-20 w-full max-w-lg black-bg border-fantasy-gold">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fantasy-gold mx-auto mb-4" />
              <p className="text-fantasy-gold">Creating room...</p>
            </div>
          </CardContent>
        </Card>

        {/* bottom fog layer (above overlay, below UI card) */}
        <div className="absolute left-0 right-0 bottom-0 z-12 pointer-events-none">
          <div className="fog-layer h-44 md:h-64 w-full" aria-hidden />
        </div>
      </div>
    )
  }

  // Game lobby
  const isHost = state.currentPlayer?.id === state.gameState.hostId
  const playerCount = Object.keys(state.gameState.players).length
  const canStart = isHost && playerCount >= 3

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: "url('/images/wolf.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* darkening overlay (lower than fog; CSS ensures correct stacking) */}
      <div className="page-bg-overlay pointer-events-none" />

      {/* main card (UI above fog) */}
      <Card className="relative z-20 w-full max-w-lg black-bg border-fantasy-gold">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-fantasy-gold">Game Lobby</CardTitle>
          <CardDescription className="text-fantasy-moonlight">
            Room: {state.roomId} {isHost && "(Host)"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Scene Info */}
          <div className="bg-black/40 border border-fantasy-gold rounded-lg p-4">
            <div className="text-center space-y-2">
              <div className="text-fantasy-amber font-semibold">Game Configuration</div>
              <div className="text-fantasy-moonlight text-sm">
                Mode: <span className="text-fantasy-gold capitalize">{state.gameState.gameMode}</span>
              </div>
              <div className="text-fantasy-moonlight text-sm">
                Scene: <span className="text-fantasy-gold capitalize">{state.gameState.sceneType}</span>
              </div>
              <div className="text-fantasy-moonlight text-sm text-fantasy-amber italic">
                Monster will be selected when game starts
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-fantasy-amber">Players ({playerCount}/5)</h3>
            <div className="space-y-2">
              {Object.values(state.gameState.players).map((player) => {
                const typedPlayer = player as Player
                return (
                  <div
                    key={typedPlayer.id}
                    className={`flex items-center justify-between p-2 rounded ${
                      typedPlayer.id === state.gameState?.hostId
                        ? "bg-fantasy-gold/20 text-fantasy-gold"
                        : "bg-black/20 text-foreground"
                    }`}
                  >
                    <span className="font-medium">{typedPlayer.name}</span>
                    {typedPlayer.id === state.gameState?.hostId && (
                      <span className="text-xs bg-fantasy-gold text-black px-2 py-1 rounded">Host</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {isHost ? (
            <div className="space-y-4">
              <div className="text-sm text-fantasy-amber text-center">
                {playerCount < 3
                  ? `Need ${3 - playerCount} more players to start`
                  : "Ready to start! All players will be assigned roles."}
              </div>
              <Button
                onClick={handleStartGame}
                disabled={!canStart || isStarting}
                className="w-full bg-fantasy-gold hover:bg-fantasy-amber text-black font-semibold fantasy-glow"
              >
                {isStarting ? "Loading..." : "Start Game"}
              </Button>
            </div>
          ) : (
            <div className="text-center text-fantasy-amber">
              Waiting for host to start the game...
            </div>
          )}

          <div className="flex justify-center">
            <Button
              onClick={() => {
                // Send leave room event to server
                if (socket) {
                  socket.emit("room:leave")
                }
                router.push("/game")
              }}
              variant="outline"
              className="border-fantasy-gold text-fantasy-gold hover:bg-fantasy-gold hover:text-black"
            >
              Leave Room
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* bottom fog layer */}
      <div className="absolute left-0 right-0 bottom-0 z-12 pointer-events-none">
        <div className="fog-layer h-44 md:h-64 w-full" aria-hidden />
      </div>
    </div>
  )
}