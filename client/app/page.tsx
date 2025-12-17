"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts"
import LoginCard from "@/components/LoginCard"

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  const ambienceRef = useRef<HTMLAudioElement | null>(null)
  const [needEnable, setNeedEnable] = useState(false)
  const [enabling, setEnabling] = useState(false)

  const openLogin = () => setShowLogin(true)
  const closeLogin = () => setShowLogin(false)

  // Setup ambience audio
  useEffect(() => {
    if (!ambienceRef.current) {
      const a = new Audio("/audio/ambience_loop.mp3")
      a.loop = true
      a.preload = "auto"
      a.volume = 0.45
      ambienceRef.current = a
    }

    const a = ambienceRef.current
    if (a) {
      a.play()
        .then(() => {
          setNeedEnable(false)
        })
        .catch(() => {
          setNeedEnable(true)
        })
    }

    return () => {
      if (ambienceRef.current) {
        ambienceRef.current.pause()
      }
    }
  }, [])

  const handleEnableTap = async () => {
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
      setNeedEnable(true)
    } finally {
      setEnabling(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden pb-16">
      {/* Cinematic background (layered images should exist in /public/images) */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/hero_far.png')",
          filter: "brightness(0.52)",
        }}
        aria-hidden
      />

      {/* Top navigation chrome */}
      <header className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold runic-text text-fantasy-gold">Monster Hunt</div>
          <div className="text-sm text-fantasy-moonlight hidden md:block">Feel the pursuit</div>
        </div>
      </header>

      {/* Hero - split layout */}
      <main className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 px-6 py-16 max-w-7xl mx-auto">
        {/* Left: headline + features */}
        <section className="max-w-2xl text-center md:text-left">
          <h1 className="text-6xl md:text-7xl font-extrabold leading-tight text-white runic-text">
            Monster Hunt
          </h1>
          <p className="mt-4 text-lg text-fantasy-moonlight max-w-xl">
            Pick a hiding spot. Change it mid-chase. Survive the night — or become the next story told around the
            fire.
          </p>

          {/* feature row */}
          <ul className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <li className="p-4 parchment-bg">
              <div className="font-semibold text-fantasy-gold">Dynamic Hiding</div>
              <div className="text-xs text-fantasy-moonlight mt-1">Move your spot mid-pursuit.</div>
            </li>
            <li className="p-4 parchment-bg">
              <div className="font-semibold text-fantasy-gold">Monster Pursuit</div>
              <div className="text-xs text-fantasy-moonlight mt-1">Tense chases brought to life with motion & sound.</div>
            </li>
            <li className="p-4 parchment-bg">
              <div className="font-semibold text-fantasy-gold">Short Rounds</div>
              <div className="text-xs text-fantasy-moonlight mt-1">Fast games — high replay value.</div>
            </li>
          </ul>
        </section>

        {/* Right: atmospheric art / trailer placeholder */}
        <aside className="w-full md:w-2/5 max-w-md">
          <div className="relative rounded-xl overflow-hidden border border-fantasy-gold mystical-glow">
            <div className="aspect-video bg-black/60 flex items-center justify-center text-fantasy-moonlight">
              {/* use an AI-generated preview or placeholder image */}
              <img
                src="/images/trailer_thumb.webp"
                alt="Trailer thumbnail - a foggy village at dusk with a wolf silhouette"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-4 bg-black/40">
              <div className="flex items-center justify-between">
                <div>
                  {/* <div className="text-sm text-fantasy-amber font-semibold">Login</div> */}
                  <div className="text-xs text-fantasy-moonlight">Connect Hive or VSC Wallet</div>
                </div>
                <button
                  onClick={openLogin}
                  className="px-4 py-2 rounded bg-fantasy-gold text-black btn-fantasy"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* How to play / footer */}
      <section id="howto" className="relative z-10 px-6 pb-12">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-white">What are you waiting for?</h2>
          <p className="mt-3 text-fantasy-moonlight">
            Will you become the hunted ? Or will you be the hunter?
            <br /> Will you survive the night? Or will you become a tale by the fire?
            <br /> Play now and find out!
          </p>
        </div>
      </section>

      <footer className="fixed bottom-0 left-0 right-0 z-10 text-center py-2 text-xs text-fantasy-moonlight">
        © Monster Hunt — Prototype. Hive integrated.
      </footer>

      {/* Modal overlay for login */}
      {showLogin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center modal-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/70 transition-opacity"
            onClick={closeLogin}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-md mx-4">
            <LoginCard onSuccess={closeLogin} />
            <button
              onClick={closeLogin}
              className="mt-4 text-center w-full text-fantasy-moonlight hover:text-white text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Tap-to-enable overlay */}
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
    </div>
  )
}
