"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGame } from "@/contexts/GameContext";
import type { Player } from "../../../types/game";

export function PlayersList() {
  const { state, actions } = useGame();
  
  const players = Object.values(state.gameState?.players || {}) as Player[];
  const sceneGraph = state.gameState?.sceneGraph;
  
  const getLocationName = (locationId: number): string => {
    if (!sceneGraph?.locations) return `Location ${locationId}`;
    return sceneGraph.locations[locationId]?.name || `Location ${locationId}`;
  };
  
  return (
    <Card className="bg-black/20 border-fantasy-gold">
      <CardHeader className="pb-2">
        <CardTitle className="text-fantasy-gold text-sm">
          Players ({players.filter((p) => p.isAlive).length}/5)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-32">
          <div className="space-y-1">
            {players.map((player) => {
              const isCurrentPlayer = player.id === state.currentPlayer?.id;
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2 rounded text-xs transition-colors duration-200 ${
                    isCurrentPlayer
                      ? "bg-fantasy-gold/20 text-fantasy-gold"
                      : player.isAlive
                        ? "text-foreground hover:bg-white/5"
                        : "text-muted-foreground line-through opacity-60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {player.name}
                    {isCurrentPlayer && <span className="text-xs text-fantasy-amber">(You)</span>}
                    <span className="text-xs opacity-60">HP: {player.health}</span>
                    {!player.isAlive && <span className="text-red-400">💀</span>}
                  </span>
                  {/* Only show location info for other players, not current player */}
                  {!isCurrentPlayer && (
                    <span className="text-xs">
                      {getLocationName(player.locationId)}
                      {player.isHiding && " (Hiding)"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}