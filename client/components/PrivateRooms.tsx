"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/userStore'
import { useGame } from '@/contexts/GameContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function PrivateRooms() {
  const router = useRouter()
  const user = useUserStore()
  const { actions } = useGame()
  const { toast } = useToast()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [selectedScene, setSelectedScene] = useState<'village' | 'castle'>('village')
  const [gameMode, setGameMode] = useState<'huntAndDiscuss' | 'huntFury'>('huntAndDiscuss')
  const [password, setPassword] = useState('')
  const [roomId, setRoomId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateRoom = async () => {
    if (!user.username) {
      toast({
        title: "Login Required",
        description: "Please login first to create a room.",
        variant: "destructive",
      })
      return
    }

    // Check if user owns the selected scene
    if (selectedScene === 'village' && !user.scenesBought?.village) {
      toast({
        title: "Scene Locked",
        description: "You need to buy the Village scene in the shop first!",
        variant: "destructive",
      })
      return
    }
    if (selectedScene === 'castle' && !user.scenesBought?.castle) {
      toast({
        title: "Scene Locked",
        description: "You need to buy the Castle scene in the shop first!",
        variant: "destructive",
      })
      return
    }

    if (!password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter a password for the private room.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const newRoomId = await actions.createRoom(user.username, gameMode, {
        userId: user.account || user.username,
        isPrivate: true,
        password: password,
        sceneType: selectedScene
      })

      router.push(`/gameRoom?id=${newRoomId}`)
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

  const handleJoinRoom = async () => {
    if (!user.username) {
      toast({
        title: "Login Required",
        description: "Please login first to join a room.",
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

    if (!password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter the room password.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      await actions.joinRoom(roomId, user.username, {
        userId: user.account || user.username,
        password: password
      })

      router.push(`/gameRoom?id=${roomId}`)
    } catch (error) {
      console.error('Error joining room:', error)
      toast({
        title: "Failed to Join Room",
        description: "Check room ID and password and try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="black-bg border-fantasy-gold">
      <CardHeader>
        <CardTitle className="text-2xl text-fantasy-gold">Private Rooms</CardTitle>
        <CardDescription className="text-fantasy-moonlight">
          Create or join a password-protected room
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle between Create and Join */}
        <div className="flex gap-2">
          <Button
            onClick={() => setMode('create')}
            className={`flex-1 ${
              mode === 'create'
                ? 'bg-fantasy-gold text-black'
                : 'bg-black/20 text-fantasy-gold border border-fantasy-gold'
            }`}
          >
            Create Room
          </Button>
          <Button
            onClick={() => setMode('join')}
            className={`flex-1 ${
              mode === 'join'
                ? 'bg-fantasy-gold text-black'
                : 'bg-black/20 text-fantasy-gold border border-fantasy-gold'
            }`}
          >
            Join Room
          </Button>
        </div>

        {mode === 'create' ? (
          <>
            <div className="space-y-2">
              <Label className="text-fantasy-amber">Game Mode</Label>
              <div className="space-y-2">
                <Button
                  onClick={() => setGameMode('huntAndDiscuss')}
                  className={`w-full ${
                    gameMode === 'huntAndDiscuss'
                      ? 'bg-fantasy-gold text-black'
                      : 'bg-black/20 text-fantasy-gold border border-fantasy-gold'
                  }`}
                >
                  Hunt & Discuss
                </Button>
                <Button
                  onClick={() => setGameMode('huntFury')}
                  className={`w-full ${
                    gameMode === 'huntFury'
                      ? 'bg-fantasy-gold text-black'
                      : 'bg-black/20 text-fantasy-gold border border-fantasy-gold'
                  }`}
                >
                  Hunt Fury
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-fantasy-amber">Select Scene (Map)</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => user.scenesBought?.village && setSelectedScene('village')}
                  disabled={!user.scenesBought?.village}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    !user.scenesBought?.village
                      ? 'border-gray-600 bg-black/40 opacity-50 cursor-not-allowed'
                      : selectedScene === 'village'
                      ? 'border-fantasy-gold bg-fantasy-gold/10'
                      : 'border-fantasy-gold/30 bg-black/20 hover:border-fantasy-gold'
                  }`}
                >
                  <div className={user.scenesBought?.village ? "text-fantasy-gold font-semibold" : "text-gray-500 font-semibold"}>
                    Village {!user.scenesBought?.village && '🔒'}
                  </div>
                  <div className="text-xs text-fantasy-moonlight mt-1">
                    {user.scenesBought?.village ? 'Classic setting' : 'Buy in shop'}
                  </div>
                </button>
                <button
                  onClick={() => user.scenesBought?.castle && setSelectedScene('castle')}
                  disabled={!user.scenesBought?.castle}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    !user.scenesBought?.castle
                      ? 'border-gray-600 bg-black/40 opacity-50 cursor-not-allowed'
                      : selectedScene === 'castle'
                      ? 'border-fantasy-gold bg-fantasy-gold/10'
                      : 'border-fantasy-gold/30 bg-black/20 hover:border-fantasy-gold'
                  }`}
                >
                  <div className={user.scenesBought?.castle ? "text-fantasy-gold font-semibold" : "text-gray-500 font-semibold"}>
                    Castle {!user.scenesBought?.castle && '🔒'}
                  </div>
                  <div className="text-xs text-fantasy-moonlight mt-1">
                    {user.scenesBought?.castle ? 'Dark chambers' : 'Buy in shop'}
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-fantasy-amber">Room Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-black/20 border-fantasy-gold text-fantasy-gold"
              />
            </div>

            <Button
              onClick={handleCreateRoom}
              disabled={isLoading || !password.trim()}
              className="w-full bg-fantasy-gold text-black hover:bg-fantasy-amber font-semibold py-6 text-lg"
            >
              {isLoading ? 'Creating...' : 'Create Private Room'}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="roomId" className="text-fantasy-amber">Room ID</Label>
              <Input
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter room ID"
                className="bg-black/20 border-fantasy-gold text-fantasy-gold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="joinPassword" className="text-fantasy-amber">Room Password</Label>
              <Input
                id="joinPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-black/20 border-fantasy-gold text-fantasy-gold"
              />
            </div>

            <Button
              onClick={handleJoinRoom}
              disabled={isLoading || !roomId.trim() || !password.trim()}
              className="w-full bg-fantasy-gold text-black hover:bg-fantasy-amber font-semibold py-6 text-lg"
            >
              {isLoading ? 'Joining...' : 'Join Private Room'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
