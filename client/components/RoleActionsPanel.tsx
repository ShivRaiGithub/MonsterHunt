"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useGame } from "@/contexts/GameContext"
import type { Player } from "../../types/game"

export function RoleActionsPanel() {
  const { state, actions } = useGame()
  
  const currentPlayer = state.currentPlayer
  const gameState = state.gameState

  if (!currentPlayer?.isAlive || !gameState) {
    return null
  }

  const alivePlayers = Object.values(gameState.players).filter((p) => (p as Player).isAlive && (p as Player).id !== currentPlayer.id) as Player[]

  const playersInSameLocation = alivePlayers.filter(
    (p) => p.locationId === currentPlayer.locationId
  )

  const deadPlayersInSameLocation = Object.values(gameState.players).filter(
    (p) => !(p as Player).isAlive && (p as Player).locationId === currentPlayer.locationId
  ) as Player[]

  const monsterName = gameState.monsterType.charAt(0).toUpperCase() + gameState.monsterType.slice(1)

  const renderMonsterActions = () => {
    if (gameState.phase !== "night") return null

    const canMove = gameState.monsterMovementEnabled
    if (!canMove) {
      return (
        <div className="space-y-2">
          <div className="text-xs text-fantasy-crimson font-semibold">{monsterName} Actions</div>
          <div className="text-xs text-muted-foreground">Can act in a few seconds...</div>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="text-xs text-fantasy-crimson font-semibold">{monsterName} Actions</div>
        
        {playersInSameLocation.length > 0 ? (
          <ScrollArea className="h-20">
            {playersInSameLocation.map((player) => (
              <Button
                key={player.id}
                onClick={() => actions.monsterAttack(player.id)}
                className="w-full mb-1 text-xs bg-fantasy-crimson hover:bg-fantasy-crimson/80"
              >
                Attack {player.name}
              </Button>
            ))}
          </ScrollArea>
        ) : (
          <div className="text-xs text-muted-foreground">No targets in this location</div>
        )}
      </div>
    )
  }

  const renderSheriffActions = () => {
    const validTargets = gameState.phase === "night" 
      ? alivePlayers.filter((p) => p.role === "monster")
      : alivePlayers

    return (
      <div className="space-y-2">
        <div className="text-xs text-fantasy-gold font-semibold">Sheriff Actions</div>
        {gameState.phase === "night" && (
          <div className="text-xs text-fantasy-amber">Can only shoot {monsterName.toLowerCase()}s at night</div>
        )}
        {validTargets.length > 0 ? (
          <ScrollArea className="h-20">
            {validTargets.map((player) => (
              <Button
                key={player.id}
                onClick={() => actions.sheriffShoot(player.id)}
                className="w-full mb-1 text-xs bg-fantasy-gold hover:bg-fantasy-gold/80 text-black"
              >
                Shoot {player.name} (HP: {player.health})
              </Button>
            ))}
          </ScrollArea>
        ) : (
          <div className="text-xs text-muted-foreground">
            {gameState.phase === "night" ? `No ${monsterName.toLowerCase()}s found` : "No targets available"}
          </div>
        )}
      </div>
    )
  }

  const renderDoctorActions = () => {
    if (gameState.phase !== "night") return null

    return (
      <div className="space-y-2">
        <div className="text-xs text-fantasy-moonlight font-semibold">Doctor Actions</div>
        {deadPlayersInSameLocation.length > 0 ? (
          <ScrollArea className="h-20">
            {deadPlayersInSameLocation.map((player) => (
              <Button
                key={player.id}
                onClick={() => actions.doctorRevive(player.id)}
                className="w-full mb-1 text-xs bg-fantasy-moonlight hover:bg-fantasy-moonlight/80 text-black"
              >
                Revive {player.name}
              </Button>
            ))}
          </ScrollArea>
        ) : (
          <div className="text-xs text-muted-foreground">
            {Object.values(gameState.players).some((p) => !(p as Player).isAlive) 
              ? "Move to same location as dead player" 
              : "No one to revive"}
          </div>
        )}
      </div>
    )
  }

  const hasActions = () => {
    if (currentPlayer.role === "monster" && gameState.phase === "night") return true
    if (currentPlayer.role === "sheriff") return true
    if (currentPlayer.role === "doctor" && gameState.phase === "night") return true
    if (currentPlayer.role === "villager" && gameState.phase === "day") return true
    return false
  }

  if (!hasActions()) {
    return null
  }

  return (
    <Card className="bg-black/20 border-fantasy-gold">
      <CardHeader className="pb-2">
        <CardTitle className="text-fantasy-gold text-sm">Role Actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {currentPlayer.role === "monster" && renderMonsterActions()}
        {currentPlayer.role === "sheriff" && renderSheriffActions()}
        {currentPlayer.role === "doctor" && renderDoctorActions()}
        {currentPlayer.role === "villager" && (
          <div className="text-xs text-muted-foreground">
            {gameState.phase === "night" ? "Hide and survive!" : "Discuss and vote!"}
          </div>
        )}
      </CardContent>
    </Card>
  )
}