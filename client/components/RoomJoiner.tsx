"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/client/contexts/AuthContext'
import { useGame } from '@/client/contexts/GameContext'
import { Button } from '@/client/components/ui/button'
import { Input } from '@/client/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/client/components/ui/card'
import { Label } from '@/client/components/ui/label'
import { useToast } from '@/client/hooks/use-toast'

export default function RoomJoiner() {
  const router = useRouter()
  const { user } = useAuth()
  const { actions } = useGame()
  const { toast } = useToast()
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState(user?.username || '')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a player name.",
        variant: "destructive",
      })
      return
    }

    if (!roomId.trim()) {
      toast({
        title: "Room ID Required",
        description: "Please enter a room ID to join.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      await actions.joinRoom(roomId, playerName, {
        userId: user?.id,
        password: password || undefined
      })

      router.push(`/gameRoom?id=${roomId}`)
    } catch (error: any) {
      console.error('Error joining room:', error)
      if (error.message?.includes('password')) {
        toast({
          title: "Incorrect Password",
          description: "The password for this private room is incorrect.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Failed to Join Room",
          description: "Unable to join the room. Please check the room ID and try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Join Game Room</CardTitle>
        <CardDescription>Enter a room ID to join an existing game</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="roomId">Room ID</Label>
          <Input
            id="roomId"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="Enter room ID"
            maxLength={6}
          />
        </div>

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
          <Label htmlFor="password">Password (if private room)</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password (optional)"
          />
        </div>

        <Button 
          onClick={handleJoinRoom} 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Joining...' : 'Join Room'}
        </Button>
      </CardContent>
    </Card>
  )
}
