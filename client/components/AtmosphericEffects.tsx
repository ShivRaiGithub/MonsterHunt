"use client"

import { useEffect, useState } from "react"
import type { GamePhase, BackgroundType } from "../../types/game"

interface AtmosphericEffectsProps {
  phase?: GamePhase
  background: BackgroundType
}

export function AtmosphericEffects({ phase, background }: AtmosphericEffectsProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  useEffect(() => {
    // Generate floating particles for atmospheric effect
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
    }))
    setParticles(newParticles)
  }, [background])

  const getParticleColor = () => {
    if (background.includes("night") || background === "wolf") {
      return "bg-blue-400/20"
    } else if (background.includes("blood_moon")) {
      return "bg-red-400/30"
    } else if (background.includes("forest")) {
      return "bg-green-400/20"
    } else {
      return "bg-yellow-400/20"
    }
  }

  const getOverlayEffect = () => {
    if (phase === "night") {
      return "bg-gradient-to-b from-blue-900/20 via-transparent to-blue-900/30"
    } else if (phase === "day") {
      return "bg-gradient-to-b from-yellow-400/10 via-transparent to-orange-400/20"
    } else if (background === "blood_moon_night") {
      return "bg-gradient-to-b from-red-900/30 via-transparent to-red-900/40"
    }
    return "bg-gradient-to-b from-black/10 via-transparent to-black/20"
  }

  return (
    <>
      {/* Phase-based overlay */}
      <div className={`absolute inset-0 ${getOverlayEffect()} transition-all duration-2000`} />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={`absolute w-1 h-1 rounded-full ${getParticleColor()} animate-float`}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${8 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Special effects for blood moon */}
      {background === "blood_moon_night" && <div className="absolute inset-0 bg-red-500/5 animate-pulse" />}

      {/* Mystical glow for wolf background */}
      {background === "wolf" && (
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
        </div>
      )}
    </>
  )
}
