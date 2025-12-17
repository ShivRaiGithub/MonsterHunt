"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import { Button } from "@/client/components/ui/button";
import { ScrollArea } from "@/client/components/ui/scroll-area";
import { useGame } from "@/client/contexts/GameContext";

export function ChatScreen() {
  const { state, actions } = useGame();
  const [chatMessage, setChatMessage] = useState("");

  const handleSendChat = () => {
    if (chatMessage.trim()) {
      actions.sendChat(chatMessage.trim());
      setChatMessage("");
    }
  };

  const isAlive = state.currentPlayer?.isAlive;
  const isDay = state.gameState?.phase === "day";
  const canChat = isAlive && isDay;

  let placeholder = "Type message...";
  if (!isAlive) placeholder = "You are dead (view only)";
  else if (!isDay) placeholder = "Chat disabled during night";

  return (
    <div>
      <Card className="bg-black/20 border-fantasy-gold">
        <CardHeader className="pb-2">
          <CardTitle className="text-fantasy-gold text-sm">
            Chat {!canChat && "(view only)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Messages */}
          <ScrollArea className="h-32 mb-2">
            <div className="space-y-1">
              {state.chatMessages.map((msg, index) => {
                const player = state.gameState?.players[msg.playerId];
                return (
                  <div
                    key={index}
                    className="text-xs animate-in fade-in duration-200"
                  >
                    <span className="text-fantasy-amber font-semibold">
                      {player?.name || "Unknown"}:
                    </span>
                    <span className="text-foreground ml-1">{msg.message}</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Input + Send */}
          <div className="flex gap-2">
            <Input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder={placeholder}
              className="flex-1 text-xs bg-black/20 border-fantasy-gold"
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              disabled={!canChat}
            />
            <Button
              onClick={handleSendChat}
              size="sm"
              className="bg-fantasy-gold hover:bg-fantasy-amber text-black"
              disabled={!chatMessage.trim() || !canChat}
            >
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
