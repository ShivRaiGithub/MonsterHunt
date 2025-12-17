"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card"
import { ScrollArea } from "@/client/components/ui/scroll-area"
import { useGame } from "@/client/contexts/GameContext"
import type { MonsterAction } from "@/types/game"

export function WolfReplayPanel() {
  const { state } = useGame()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (state.monsterReplay.length > 0) {
      console.log("Monster replay data available:", state.monsterReplay)
      setIsVisible(true)
    }
  }, [state.monsterReplay])

  const shouldShow = state.monsterReplay.length > 0 && 
                    state.currentPlayer?.role !== "monster" &&
                    state.gameState?.phase === "day" &&
                    isVisible

  if (!shouldShow) {
    return null
  }

  const monsterName = state.gameState?.monsterType 
    ? state.gameState.monsterType.charAt(0).toUpperCase() + state.gameState.monsterType.slice(1)
    : "Monster"

  const formatAction = (action: MonsterAction) => {
    // Don't show timestamp, just the action description
    return action.description
  }

  return (
    <Card className="bg-black/20 border-fantasy-crimson">
      <CardHeader className="pb-2">
        <CardTitle className="text-fantasy-crimson text-sm">{monsterName}'s Last Night</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-32 mb-2">
          <div className="space-y-1">
            {state.monsterReplay.length === 0 ? (
              <div className="text-xs text-foreground/60 p-1">
                No {monsterName.toLowerCase()} actions recorded
              </div>
            ) : (
              state.monsterReplay.map((action, index) => (
                <div key={index} className="text-xs text-foreground p-1 rounded bg-black/20">
                  {formatAction(action)}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}