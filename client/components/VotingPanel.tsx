"use client"

import { Button } from "@/client/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card"
import { ScrollArea } from "@/client/components/ui/scroll-area"
import { useGame } from "@/client/contexts/GameContext"

export function VotingPanel() {
  const { state, actions } = useGame()
  const currentPlayer = state.currentPlayer
  const gameState = state.gameState

  if (!currentPlayer?.isAlive || !gameState || gameState.phase !== "day" || gameState.winner !== null) {
    return null
  }

  const alivePlayers = Object.values(gameState.players).filter((p) => p.isAlive && p.id !== currentPlayer.id)

  const currentVote = gameState.votes[currentPlayer.id]
  const voteCounts: Record<string, number> = {}

  Object.values(gameState.votes).forEach((targetId) => {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1
  })

  return (
    <Card className="bg-black/20 border-fantasy-gold">
      <CardHeader className="pb-2">
        <CardTitle className="text-fantasy-gold text-sm">Voting Phase</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="text-xs text-fantasy-amber">Vote to eliminate a player:</div>

          <ScrollArea className="h-32">
            {alivePlayers.map((player) => {
              const votes = voteCounts[player.id] || 0
              const isCurrentVote = currentVote === player.id

              return (
                <Button
                  key={player.id}
                  onClick={() => actions.castVote(player.id)}
                  className={`w-full mb-1 text-xs ${
                    isCurrentVote
                      ? "bg-fantasy-crimson hover:bg-fantasy-crimson/80"
                      : "bg-fantasy-gold hover:bg-fantasy-gold/80 text-black"
                  }`}
                >
                  {player.name} ({votes} votes) {isCurrentVote && "✓"}
                </Button>
              )
            })}
          </ScrollArea>

          {currentVote && (
            <div className="text-xs text-fantasy-amber">Your vote: {gameState.players[currentVote]?.name}</div>
          )}

          <div className="text-xs text-muted-foreground">
            Votes cast: {Object.keys(gameState.votes).length}/{alivePlayers.length + 1}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}