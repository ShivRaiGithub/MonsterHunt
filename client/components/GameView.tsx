"use client";

import { useGame } from "@/contexts/GameContext";
import { GameCanvas } from "@/components/GameCanvas";
import { RightPanel } from "@/components/RightPanel";
import { CombatFeedback } from "@/components/CombatFeedback";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ChatScreen } from "./InMatch/chatScreen";
import { useEffect, useState } from "react";
import type { GameEvent } from "../../types/game";

function GameEventNotifications() {
  const { state } = useGame();
  const [visibleEvents, setVisibleEvents] = useState<Array<GameEvent & { id: string; shown?: boolean }>>([]);

  useEffect(() => {
    // Only add new events that haven't been shown yet
    const newEvents = state.gameEvents.filter(event => {
      const eventWithId = event as GameEvent & { id: string; shown?: boolean };
      if (eventWithId.shown) return false;
      
      // Don't show "monster is near" notifications to the monster player
      if (eventWithId.type === "monster_moved" && state.currentPlayer?.role === "monster") {
        return false;
      }
      
      // If event has affectedPlayers, only show to those players
      if (eventWithId.affectedPlayers && eventWithId.affectedPlayers.length > 0) {
        return eventWithId.affectedPlayers.includes(state.currentPlayer?.id || "");
      }
      
      return true;
    });

    if (newEvents.length > 0) {
      // Mark events as shown
      newEvents.forEach(event => {
        const eventWithId = event as GameEvent & { id: string; shown?: boolean };
        eventWithId.shown = true;
      });

      // Add to visible events
      setVisibleEvents(prev => [...prev, ...newEvents as Array<GameEvent & { id: string; shown?: boolean }>]);

      // Remove each event after 5 seconds individually
      newEvents.forEach((_, index) => {
        setTimeout(() => {
          setVisibleEvents(current => current.slice(1));
        }, 5000 + (index * 100)); // Stagger removal slightly
      });
    }
  }, [state.gameEvents, state.currentPlayer]);

  return (
    <div className="fixed top-20 right-4 z-40 space-y-2 max-w-sm">
      {visibleEvents.map((event) => (
        <div
          key={event.id}
          className="bg-fantasy-gold/90 text-black p-3 rounded-lg shadow-lg animate-in slide-in-from-right-5 fade-in duration-300"
        >
          <div className="text-sm font-semibold">{event.message}</div>
        </div>
      ))}
    </div>
  );
}

interface GameViewProps {
  onBackToLobby: () => void;
}

export function GameView({ onBackToLobby }: GameViewProps) {
  const { state } = useGame();

  if (!state.gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-fantasy-gold mb-4">
            Loading Game...
          </h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fantasy-gold mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Connection Status */}
      <ConnectionStatus />

      {/* Combat Feedback */}
      <CombatFeedback />

      {/* Game Event Notifications */}
      <GameEventNotifications />

      {/* Left side - Game Canvas (70%) - Fixed, no scrolling */}
      <div className="w-[70%] relative h-screen overflow-hidden">
        <GameCanvas />

        {/* <ChatScreen /> */}
      </div>

      {/* Right side - UI Panel (30%) - Scrollable */}
      <div className="w-[30%] border-l border-fantasy-gold h-screen overflow-hidden">
        <RightPanel onBackToLobby={onBackToLobby} />
      </div>
    </div>
  );
}
