"use client"

import React, { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import PublicRooms from "@/components/PublicRooms"
import PrivateRooms from "@/components/PrivateRooms"
import type { GameMode } from "../../../types/game"

export default function GamePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading } = useAuth()

  const [playerName, setPlayerName] = useState<string>("")
  const [selectedMode, setSelectedMode] = useState<GameMode>("huntAndDiscuss")
  const [checkedAuth, setCheckedAuth] = useState(false)
  const [roomType, setRoomType] = useState<'public' | 'private'>('public')

  const ambienceRef = useRef<HTMLAudioElement | null>(null)
  const heartbeatRef = useRef<HTMLAudioElement | null>(null)

  // autoplay blocked / need user gesture
  const [needEnable, setNeedEnable] = useState(false)
  const [enabling, setEnabling] = useState(false)

  // vignette / heartbeat UI state
  const [showVignette, setShowVignette] = useState(false)
  const [playDisabled, setPlayDisabled] = useState(false)
  const routeTimeoutRef = useRef<number | null>(null)

  // Read username from localStorage (set during login)
  useEffect(() => {
    // Try localStorage
    try {
      const saved = localStorage.getItem("mh_playerName")
      const savedMode = localStorage.getItem("mh_mode") as GameMode | null
      if (saved) {
        setPlayerName(saved)
        if (savedMode) {
          setSelectedMode(savedMode)
        }
        setCheckedAuth(true)
        return
      }
    } catch (e) {
      // ignore storage errors
    }

    // No valid login found — force user back to landing (flow enforcement)
    router.push("/")
    // mark checked to avoid showing flash
    setCheckedAuth(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Setup ambience & heartbeat audio elements
  useEffect(() => {
    if (!ambienceRef.current) {
      const a = new Audio("/audio/ambience_loop.mp3")
      a.loop = true
      a.preload = "auto"
      a.volume = 0.45
      ambienceRef.current = a
    }
    

    // Attempt autoplay
    const a = ambienceRef.current
    if (a) {
      a.play()
        .then(() => {
          // autoplay succeeded — all good
          setNeedEnable(false)
        })
        .catch(() => {
          // autoplay blocked — show prompt
          setNeedEnable(true)
        })
    }

    return () => {
      // cleanup: pause ambience
      if (ambienceRef.current) {
        ambienceRef.current.pause()
      }
      // clear any pending timeouts
      if (routeTimeoutRef.current) {
        window.clearTimeout(routeTimeoutRef.current)
      }
    }
  }, [])

  const handleEnableTap = async () => {
    // user tapped to enable ambience after autoplay blocked
    setEnabling(true)
    try {
      if (!ambienceRef.current) {
        ambienceRef.current = new Audio("/audio/ambience_loop.mp3")
        ambienceRef.current.loop = true
        ambienceRef.current.preload = "auto"
        ambienceRef.current.volume = 0.45
      }
      await ambienceRef.current.play()
      setNeedEnable(false)
    } catch {
      // if still can't play (rare), keep showing prompt
      setNeedEnable(true)
    } finally {
      setEnabling(false)
    }
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem("mh_playerName")
      localStorage.removeItem("mh_authToken")
      localStorage.removeItem("mh_mode")
      localStorage.removeItem("mh_wallet")
      localStorage.removeItem("mh_walletType")
      localStorage.removeItem("mh_walletPublicKey")
      // Also clear AuthContext keys
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      // keep mh_mute as it is
    } catch {}
    router.push("/")
  }

  if (!checkedAuth) {
    // simple early blank while we check
    return <div className="min-h-screen bg-black/80" />
  }

  const handlePlay = () => {
    if (!playerName.trim() || playDisabled) return

    const routeNow = () => {
      router.push(`/gameRoom?mode=${selectedMode}`)
    }


    // not muted: play heartbeat and show vignette, then route after short delay
    setPlayDisabled(true)
    setShowVignette(true)


    // route after 800ms so vignette & heartbeat land
    routeTimeoutRef.current = window.setTimeout(() => {
      setShowVignette(false)
      routeNow()
    }, 800)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: "url('/images/wolf.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* ambient overlay */}
      <div className="page-bg-overlay pointer-events-none" />

      {/* Top-right controls */}
      <div className="absolute top-4 right-4 z-30 flex gap-3">
        <button
          onClick={() => {
            window.location.href = '/shop'
          }}
          title="Visit the shop"
          className="px-3 py-2 rounded border border-fantasy-gold bg-black/30 text-fantasy-gold btn-fantasy"
        >
          Shop
        </button>

        <button
          onClick={() => {
            window.location.href = '/profile'
          }}
          title="View your profile"
          className="px-3 py-2 rounded border border-fantasy-gold bg-black/30 text-fantasy-gold btn-fantasy"
        >
          Profile
        </button>

        <button
          onClick={handleLogout}
          title="Logout and return to landing"
          className="px-3 py-2 rounded border border-fantasy-gold bg-black/20 text-fantasy-amber btn-fantasy"
        >
          Logout
        </button>
      </div>

      {/* main card */}
      <div className="relative z-20 w-full max-w-2xl">
        <div className="flex gap-4 mb-4 justify-center">
          <Button
            onClick={() => setRoomType('public')}
            className={roomType === 'public' ? "bg-fantasy-gold text-black" : "bg-black/20 text-fantasy-gold border border-fantasy-gold"}
          >
            Public Rooms
          </Button>
          <Button
            onClick={() => setRoomType('private')}
            className={roomType === 'private' ? "bg-fantasy-gold text-black" : "bg-black/20 text-fantasy-gold border border-fantasy-gold"}
          >
            Private Rooms
          </Button>
        </div>

        <div className="relative z-10">
          {roomType === 'public' ? <PublicRooms /> : <PrivateRooms />}
        </div>

        <div className="hidden">
          <Card className="relative z-10 black-bg border-fantasy-gold">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-fantasy-gold">Play Game</CardTitle>
              <CardDescription className="text-fantasy-moonlight">Select game mode and click Play</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
           
              <div className="space-y-2">
                <label className="text-sm font-medium text-fantasy-amber">Game Mode</label>
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      setSelectedMode("huntAndDiscuss")
                      try {
                        localStorage.setItem("mh_mode", "huntAndDiscuss")
                      } catch {}
                    }}
                    className={`w-full ${
                      selectedMode === "huntAndDiscuss"
                        ? "bg-fantasy-gold text-black"
                        : "bg-black/20 text-fantasy-gold border border-fantasy-gold"
                    }`}
                  >
                    Hunt and Discuss
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedMode("huntFury")
                    try {
                      localStorage.setItem("mh_mode", "huntFury")
                    } catch {}
                  }}
                  className={`w-full ${
                    selectedMode === "huntFury"
                      ? "bg-fantasy-gold text-black"
                      : "bg-black/20 text-fantasy-gold border border-fantasy-gold"
                  }`}
                >
                  Hunt Fury
                </Button>
              </div>
              <div className="text-xs text-fantasy-moonlight mt-2">
                {selectedMode === "huntAndDiscuss" && (
                  <p>Hunt and Discuss: Players hide during night, monster hunts. During day, discuss and vote.</p>
                )}
                {selectedMode === "huntFury" && (
                  <p>Hunt Fury: Villagers hunt the monster during day (30s), monster hunts at night (60s). Last player standing wins!</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={handlePlay}
                disabled={!playerName.trim() || playDisabled}
                className="w-full bg-fantasy-gold hover:bg-fantasy-amber text-black font-semibold fantasy-glow text-lg py-6"
              >
                Play
              </Button>

              <div className="text-xs text-center text-fantasy-amber">
                Will join existing room or create new one
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* bottom fog layer */}
      <div className="absolute left-0 right-0 bottom-0 z-10 pointer-events-none">
        <div className="fog-layer h-44 md:h-64 w-full" aria-hidden />
      </div>

      {/* Tap-to-enable overlay (only when autoplay blocked and audio not muted) */}
      {needEnable && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/75" onClick={() => { /* keep it modal */ }} />
          <div className="relative z-50 w-full max-w-sm p-6 rounded-lg parchment-bg text-center">
            <div className="text-lg font-semibold text-fantasy-gold">Tap to enable ambience</div>
            <div className="text-xs text-fantasy-moonlight mt-2">Tap to allow the game's ambient soundscape.</div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleEnableTap}
                disabled={enabling}
                className="px-4 py-2 rounded bg-fantasy-gold text-black btn-fantasy"
              >
                {enabling ? "Enabling..." : "Enable Ambience"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* vignette / heartbeat flash */}
      <div className={`fixed inset-0 z-40 pointer-events-none transition-opacity ${showVignette ? "vignette-active" : "vignette-hidden"}`} />
    </div>
  )
}