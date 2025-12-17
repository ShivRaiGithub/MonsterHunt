"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/client/contexts/AuthContext'
import { useGame } from '@/client/contexts/GameContext'
import { Button } from '@/client/components/ui/button'
import { Input } from '@/client/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/client/components/ui/card'
import { Label } from '@/client/components/ui/label'
import { Checkbox } from '@/client/components/ui/checkbox'
import { useToast } from '@/client/hooks/use-toast'

export default function RoomCreator() {
  const router = useRouter()
  const { user } = useAuth()
  const { actions } = useGame()
  const { toast } = useToast()
  const [playerName, setPlayerName] = useState(user?.username || '')
  const [gameMode, setGameMode] = useState<'huntAndDiscuss' | 'huntFury'>('huntAndDiscuss')
  const [isPrivate, setIsPrivate] = useState(false)
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a player name.",
        variant: "destructive",
      })
      return
    }

    if (isPrivate && !password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter a password for the private room.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const roomId = await actions.createRoom(playerName, gameMode, {
        userId: user?.id,
        isPrivate,
        password: isPrivate ? password : undefined
      })

      router.push(`/gameRoom?id=${roomId}`)
    } catch (error) {
      console.error('Error creating room:', error)
      toast({
        title: "Failed to Create Room",
        description: "Unable to create the room. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Game Room</CardTitle>
        <CardDescription>Set up a new werewolf game</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="playerName">Player Name</Label>
          <Input
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <div>
          <Label htmlFor="gameMode">Game Mode</Label>
          <select
            id="gameMode"
            className="w-full px-3 py-2 border rounded-md"
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value as any)}
          >
            <option value="huntAndDiscuss">Hunt & Discuss</option>
            <option value="huntFury">Hunt Fury</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isPrivate"
            checked={isPrivate}
            onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
          />
          <Label htmlFor="isPrivate">Make this a private room</Label>
        </div>

        {isPrivate && (
          <div>
            <Label htmlFor="password">Room Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter room password"
            />
          </div>
        )}

        <Button 
          onClick={handleCreateRoom} 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Room'}
        </Button>
      </CardContent>
    </Card>
  )
}
