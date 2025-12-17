"use client"

import React, { useState } from 'react'
import { Button } from "@/client/components/ui/button"
import { Input } from "@/client/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card"

interface UsernameSelectionProps {
  hiveAccount: string
  publicKey: string
  onUsernameSet: (username: string) => void
}

export default function UsernameSelection({ hiveAccount, publicKey, onUsernameSet }: UsernameSelectionProps) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/check-username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      })

      const data = await response.json()
      return data.available
    } catch (error) {
      console.error('Error checking username:', error)
      return false
    }
  }

  const handleSubmit = async () => {
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    if (username.length < 3 || username.length > 20) {
      setError('Username must be between 3 and 20 characters')
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError('Username can only contain letters, numbers, hyphens, and underscores')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const isAvailable = await checkUsernameAvailability(username)
      
      if (!isAvailable) {
        setError('This username is already taken. Please choose a different one.')
        setLoading(false)
        return
      }

      onUsernameSet(username)
    } catch (error) {
      setError('Failed to verify username. Please try again.')
      setLoading(false)
    }
  }

  return (
    <Card className="black-bg border-fantasy-gold max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-fantasy-gold">Choose Your Username</CardTitle>
        <CardDescription className="text-fantasy-moonlight">
          Welcome, {hiveAccount}! This is your first time here. Please choose a unique username to continue.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm block text-fantasy-amber">Username</label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="bg-black/20 border-fantasy-gold"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit()
              }
            }}
            autoFocus
            disabled={loading}
          />
          <p className="text-xs text-fantasy-moonlight">
            3-20 characters, letters, numbers, hyphens, and underscores only
          </p>
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
            {error}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={loading || !username.trim()}
          className="w-full bg-fantasy-gold text-black hover:bg-fantasy-amber font-semibold"
        >
          {loading ? 'Checking...' : 'Continue'}
        </Button>
      </CardContent>
    </Card>
  )
}
