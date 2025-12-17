"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/client/store/userStore'
import { useGame } from '@/client/contexts/GameContext'
import { Button } from '@/client/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/client/components/ui/card'
import { Label } from '@/client/components/ui/label'
import { useToast } from '@/client/hooks/use-toast'

export default function PublicRooms() {
  const router = useRouter()
  const user = useUserStore()
  const { actions } = useGame()
  const { toast } = useToast()
  const [selectedScene, setSelectedScene] = useState<'village' | 'castle'>('village')
  const [gameMode, setGameMode] = useState<'huntAndDiscuss' | 'huntFury'>('huntAndDiscuss')
  const [isLoading, setIsLoading] = useState(false)

  const handlePlay = async () => {
    if (!user.username) {
      toast({
        title: "Login Required",
        description: "Please login first to join a room.",
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

    setIsLoading(true)

    try {
      // Auto-join or create public room based on scene
      const roomId = await actions.createRoom(user.username, gameMode, {
        userId: user.account || user.username,
        isPrivate: false,
        sceneType: selectedScene
      })

      router.push(`/gameRoom?id=${roomId}`)
    } catch (error) {
      console.error('Error joining public room:', error)
      toast({
        title: "Failed to Join Room",
        description: "Unable to join the room. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="black-bg border-fantasy-gold">
      <CardHeader>
        <CardTitle className="text-2xl text-fantasy-gold">Public Rooms</CardTitle>
        <CardDescription className="text-fantasy-moonlight">
          Select a map and join other players
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <Button
          onClick={handlePlay}
          disabled={isLoading}
          className="w-full bg-fantasy-gold text-black hover:bg-fantasy-amber font-semibold py-6 text-lg"
        >
          {isLoading ? 'Joining...' : 'Play'}
        </Button>

        <div className="text-xs text-center text-fantasy-moonlight">
          You'll be automatically matched with other players
        </div>
      </CardContent>
    </Card>
  )
}
