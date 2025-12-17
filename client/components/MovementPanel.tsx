"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useGame } from "@/contexts/GameContext"

export function MovementPanel() {
  const { state, actions } = useGame()
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  
  const currentPlayer = state.currentPlayer
  const gameState = state.gameState
  const isMonster = currentPlayer?.role === "monster"
  const isNight = gameState?.phase === "night"
  const canMonsterMove = !isMonster || !isNight || gameState?.monsterMovementEnabled

  // Track cooldown for monster movements (2 seconds)
  useEffect(() => {
    if (!isMonster || !isNight || !currentPlayer?.lastAction) return

    const updateCooldown = () => {
      const now = Date.now()
      const cooldownDuration = 2000 // 2 seconds
      const elapsed = now - currentPlayer.lastAction
      const remaining = Math.max(0, cooldownDuration - elapsed)
      
      setCooldownRemaining(Math.ceil(remaining / 1000))
      
      if (remaining > 0) {
        requestAnimationFrame(updateCooldown)
      }
    }

    updateCooldown()
  }, [isMonster, isNight, currentPlayer?.lastAction])

  const canMove = currentPlayer?.isAlive && state.isConnected && canMonsterMove && cooldownRemaining === 0

  if (!canMove) {
    return (
      <Card className="bg-black/20 border-fantasy-gold">
        <CardHeader className="pb-2">
          <CardTitle className="text-fantasy-gold text-sm">Movement</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center text-muted-foreground text-xs">
            {!currentPlayer?.isAlive ? "You are dead" : 
             isMonster && isNight && !canMonsterMove ? "Monster can move in a few seconds..." : 
             "Cannot move"}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get scene graph
  const sceneGraph = gameState?.sceneGraph
  const currentLocationId = currentPlayer?.locationId || 0

  const getAdjacentLocations = (): number[] => {
    if (!sceneGraph?.adjacencyList) return []
    return sceneGraph.adjacencyList[currentLocationId] || []
  }

  const getLocationName = (locationId: number): string => {
    if (!sceneGraph?.locations) return `Location ${locationId}`
    return sceneGraph.locations[locationId]?.name || `Location ${locationId}`
  }

  const getButtonText = (locationId: number): string => {
    const location = sceneGraph?.locations?.[locationId]
    if (!location) return `Go to Location ${locationId}`
    
    // If currently hiding, show "Come out of hiding" for non-hiding locations
    if (currentPlayer?.isHiding && location.type !== "hiding") {
      return "Come out of hiding"
    }
    
    // For hiding spots, show "Hide in/under/behind X"
    if (location.type === "hiding") {
      const name = location.name
      if (name.toLowerCase().includes("under")) {
        return `Hide ${name}`
      } else if (name.toLowerCase().includes("behind")) {
        return `Hide ${name}`
      } else if (name.toLowerCase().includes("in")) {
        return `Hide ${name}`
      }
      return `Hide in ${name}`
    }
    
    // For other locations
    return `Go to ${location.name}`
  }

  const adjacentLocations = getAdjacentLocations()

  return (
    <Card className="bg-black/20 border-fantasy-gold">
      <CardHeader className="pb-2">
        <CardTitle className="text-fantasy-gold text-sm">
          Movement {isMonster && isNight && "(Monster Path)"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {cooldownRemaining > 0 && isMonster ? (
            <div className="text-center text-fantasy-amber text-xs py-2">
              Cooldown: {cooldownRemaining}s
            </div>
          ) : adjacentLocations.length > 0 ? (
            adjacentLocations.map((locationId: number) => (
              <Button
                key={locationId}
                onClick={() => actions.moveToLocation(locationId)}
                disabled={cooldownRemaining > 0}
                className="w-full text-xs bg-fantasy-amber hover:bg-fantasy-amber/80 text-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {getButtonText(locationId)}
              </Button>
            ))
          ) : (
            <div className="text-xs text-muted-foreground">
              Waiting for location data...
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-2">
            Current: {getLocationName(currentLocationId)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}