"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { LobbyView } from "@/components/LobbyView"
import { GameView } from "@/components/GameView"

function GameRoomContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentView, setCurrentView] = useState<"lobby" | "game">("lobby")
  const [name, setName] = useState<string | null>(null)

  const mode = searchParams.get("mode") as any
  const roomId = searchParams.get("id")

  useEffect(() => {
    // Read username from localStorage
    try {
      const savedName = localStorage.getItem("mh_playerName")
      if (savedName) {
        setName(savedName)
      } else {
        router.push("/game")
      }
    } catch {
      router.push("/game")
    }
  }, [router])

  if (!name) {
    return null
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="min-h-screen">
        {currentView === "lobby" ? (
          <LobbyView 
            onGameStart={() => setCurrentView("game")} 
            initialMode={mode}
            initialName={name}
            initialRoomId={roomId}
          />
        ) : (
          <GameView onBackToLobby={() => router.push("/game")} />
        )}
      </div>
    </main>
  )
}

export default function GameRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-fantasy-gold">Loading...</div>
      </div>
    }>
      <GameRoomContent />
    </Suspense>
  )
}