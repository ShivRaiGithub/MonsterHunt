"use client"

import { useGame } from "@/client/contexts/GameContext"
import { useEffect, useState } from "react"
import { AtmosphericEffects } from "@/client/components/AtmosphericEffects"

export function GameCanvas() {
  const { state } = useGame()
  const [backgroundLoaded, setBackgroundLoaded] = useState(false)
  const [previousBackground, setPreviousBackground] = useState<string | null>(null)
  const [showPhaseTitle, setShowPhaseTitle] = useState(false)

  const currentPlayer = state.currentPlayer
  const gameState = state.gameState

  // Get background based on player location and phase
  const getBackgroundForLocation = (locationId: number, phase: string): string => {
    const sceneGraph = gameState?.sceneGraph
    if (!sceneGraph?.locations) return gameState?.currentBackground || "village_night"
    
    const location = sceneGraph.locations[locationId]
    if (!location) return gameState?.currentBackground || "village_night"
    
    const isNight = phase === "night"
    const suffix = isNight ? "_night" : "_day"
    
    // Map location names to background images
    const locationName = location.name.toLowerCase()
    
    // Hiding spots always show black screen
    if (location.type === "hiding") {
      return "hiding"
    }
    
    // Check scene type for proper background mapping
    if (gameState?.sceneType === "castle") {
      // Castle scene mappings - use castle-specific image names
      if (locationName.includes("castle outside")) {
        return `castle${suffix}`
      } else if (locationName.includes("hall")) {
        return `hall${suffix}`
      } else if (locationName.includes("floor")) {
        return `floor${suffix}`
      } else if (locationName.includes("bedroom")) {
        return `bedroom${suffix}`
      } else if (locationName.includes("dining")) {
        return `dining${suffix}`
      } else if (locationName.includes("kitchen")) {
        return `kitchen${suffix}`
      } else if (locationName.includes("storage")) {
        return `storage${suffix}`
      }
    } else {
      // Village scene mappings
      if (locationName.includes("forest")) {
        return `forest${suffix}`
      } else if (locationName.includes("village")) {
        return `village${suffix}`
      } else if (locationName.includes("house")) {
        return `house${suffix}`
      }
    }
    
    // Default fallback
    return `village${suffix}`
  }

  let backgroundImage = currentPlayer?.locationId !== undefined && gameState?.phase
    ? getBackgroundForLocation(currentPlayer.locationId, gameState.phase)
    : gameState?.currentBackground || "village_night"

  // Override for hiding players - show black
  const isPlayerHiding = currentPlayer?.isHiding || backgroundImage === "hiding"
  const displayBackground = isPlayerHiding ? null : backgroundImage

  useEffect(() => {
    if (displayBackground && displayBackground !== previousBackground) {
      setBackgroundLoaded(false)
      const img = new Image()
      img.onload = () => {
        setBackgroundLoaded(true)
        setPreviousBackground(displayBackground)
      }
      // Use scene-specific subfolder path
      const sceneFolder = gameState?.sceneType || "village"
      img.src = `/images/${sceneFolder}/${displayBackground}.png`
    } else if (!displayBackground) {
      setBackgroundLoaded(true)
    }
  }, [displayBackground, previousBackground, gameState?.sceneType])

  // Show phase title/subtitle for first 5 seconds of phase start
  useEffect(() => {
    if (!gameState?.phaseStartTime) return

    setShowPhaseTitle(true)
    const timer = setTimeout(() => {
      setShowPhaseTitle(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [gameState?.phaseStartTime, gameState?.phase])

  const getPhaseTitle = () => {
    if (!gameState) return "Loading..."
    const isHuntFury = gameState.gameMode === "huntFury"

    switch (gameState.phase) {
      case "lobby":
        return "Waiting for Players..."
      case "night":
        return currentPlayer?.role === "monster" ? "Hunt Time" : "Sleep Safely"
      case "day":
        return isHuntFury ? "Hunt the Monster!" : "Discussion & Voting"
      case "ended":
        return gameState.winner === "monster"
          ? `${gameState.monsterType.charAt(0).toUpperCase() + gameState.monsterType.slice(1)} Victory!`
          : "Village Victory!"
      default:
        return "Game in Progress"
    }
  }

  const getPhaseSubtitle = () => {
    if (!gameState || gameState.phase === "lobby") return ""
    const isHuntFury = gameState.gameMode === "huntFury"

    if (gameState.phase === "night") {
      if (currentPlayer?.role === "monster") {
        return `Hunt through the ${gameState.sceneType}`
      } else if (currentPlayer?.role === "sheriff") {
        return isHuntFury ? "2x damage during day - survive the night!" : "Patrol and protect the village"
      } else if (currentPlayer?.role === "doctor") {
        return "Prepare to save lives"
      } else {
        return "Hide and survive the night"
      }
    } else if (gameState.phase === "day") {
      if (isHuntFury) {
        if (currentPlayer?.role === "monster") {
          return "Survive the hunt - you'll be notified when humans are near"
        } else if (currentPlayer?.role === "sheriff") {
          return "Track and eliminate the monster - you deal 2x damage!"
        } else {
          return "30 seconds to hunt down the monster"
        }
      } else {
        return `Discuss what happened and vote to eliminate the ${gameState.monsterType}`
      }
    }

    return ""
  }

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* Background with transition effects - black when hiding */}
      <div
        className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
          backgroundLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
        }`}
        style={{
          backgroundColor: isPlayerHiding ? "black" : "transparent",
          backgroundImage: isPlayerHiding
            ? "none"
            : `url('/images/${gameState?.sceneType || "village"}/${backgroundImage}.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Atmospheric overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />

      {/* Atmospheric effects - hide when player is hiding */}
      {!isPlayerHiding && (
        <AtmosphericEffects
          phase={gameState?.phase}
          background={backgroundImage}
        />
      )}

      {/* Main content overlay */}
      <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-8">
        <div className="max-w-2xl">
          {/* Phase title - show only for first 5 seconds */}
          {showPhaseTitle && (
            <>
              <h1 className="text-5xl md:text-6xl font-bold text-fantasy-moonlight runic-text mb-4 drop-shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {getPhaseTitle()}
              </h1>

              {/* Phase subtitle */}
              {getPhaseSubtitle() && (
                <p className="text-lg md:text-xl text-fantasy-amber mb-6 drop-shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                  {getPhaseSubtitle()}
                </p>
              )}
            </>
          )}

          {/* Hiding status */}
          {isPlayerHiding && (
            <div className="mb-6 inline-flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-fantasy-gold/30">
              <span className="text-fantasy-gold text-lg font-semibold">
                You are hiding
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {!backgroundLoaded && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fantasy-gold mx-auto mb-4" />
            <p className="text-fantasy-gold">Loading scene...</p>
          </div>
        </div>
      )}
    </div>
  )
}