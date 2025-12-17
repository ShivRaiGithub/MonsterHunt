"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/client/store/userStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/client/components/ui/card'
import { Button } from '@/client/components/ui/button'
import { useToast } from '@/client/hooks/use-toast'

interface ShopItem {
  id: string
  name: string
  type: 'scene' | 'monster'
  price: number
  description: string
  owned: boolean
}

export default function ShopPage() {
  const router = useRouter()
  const user = useUserStore()
  const { toast } = useToast()
  const [items, setItems] = useState<ShopItem[]>([])
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    if (!user.username) {
      router.push("/")
      return
    }

    // Initialize shop items
    const shopItems: ShopItem[] = [
      {
        id: 'scene_village',
        name: 'Village Scene',
        type: 'scene',
        price: 100,
        description: 'Classic village setting with mysterious alleys and dark corners',
        owned: user.scenesBought?.village || false
      },
      {
        id: 'scene_castle',
        name: 'Castle Scene',
        type: 'scene',
        price: 150,
        description: 'Gothic castle with towers, dungeons, and secret passages',
        owned: user.scenesBought?.castle || false
      },
      {
        id: 'monster_werewolf',
        name: 'Werewolf Gene',
        type: 'monster',
        price: 200,
        description: 'Unlock the ability to become a werewolf - powerful and fast',
        owned: user.monsterGenes?.werewolf || false
      },
      {
        id: 'monster_vampire',
        name: 'Vampire Gene',
        type: 'monster',
        price: 250,
        description: 'Unlock the ability to become a vampire - stealthy and cunning',
        owned: user.monsterGenes?.vampire || false
      }
    ]

    setItems(shopItems)
  }, [isHydrated, user.username, user.scenesBought, user.monsterGenes, user.huntTokens])

  const handlePurchase = async (item: ShopItem) => {
    if (user.huntTokens < item.price) {
      toast({
        title: "Insufficient Tokens",
        description: "You don't have enough Hunt Tokens for this purchase.",
        variant: "destructive",
      })
      return
    }

    setPurchasing(item.id)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/shop/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mh_authToken')}`
        },
        body: JSON.stringify({
          username: user.username,
          itemId: item.id,
          itemType: item.type
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Purchase failed')
      }

      // Update user store with new data
      user.setUser({
        huntTokens: data.user.huntTokens,
        scenesBought: data.user.scenesBought,
        monsterGenes: data.user.monsterGenes
      })

      toast({
        title: "Purchase Successful!",
        description: `You've unlocked ${item.name}.`,
      })
    } catch (error) {
      console.error('Purchase error:', error)
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : 'Failed to purchase item',
        variant: "destructive",
      })
    } finally {
      setPurchasing(null)
    }
  }

  if (!isHydrated || !user.username) {
    return (
      <div className="min-h-screen bg-black/80 flex items-center justify-center">
        <div className="text-fantasy-gold">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative p-4">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/shop.png')",
          filter: "brightness(0.4)",
        }}
        aria-hidden
      />

      {/* Logo at bottom right */}
      <div className="fixed bottom-2 right-2 z-20">
        <img
          src="/images/circle_logo.png"
          alt="Monster Hunt Logo" 
          className="w-30 h-30 opacity-70 transition-opacity"
        />
      </div>

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-fantasy-gold">Shop</h1>
          <div className="flex gap-4 items-center">
            <div className="text-fantasy-amber">
              Hunt Tokens: <span className="text-fantasy-gold font-bold">{user.huntTokens}</span>
            </div>
            <Button
              onClick={() => router.push('/game')}
              variant="outline"
              className="border-fantasy-gold text-fantasy-gold hover:bg-fantasy-gold hover:text-black"
            >
              Back to Game
            </Button>
          </div>
        </div>

        {/* Shop Items */}
        <div className="space-y-6">
          {/* Scenes Section */}
          <div>
            <h2 className="text-2xl font-bold text-fantasy-amber mb-4">Scenes / Maps</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.filter(item => item.type === 'scene').map(item => (
                <Card key={item.id} className="black-bg border-fantasy-gold">
                  <CardHeader>
                    <CardTitle className="text-fantasy-gold">{item.name}</CardTitle>
                    <CardDescription className="text-fantasy-moonlight">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-fantasy-amber">
                        Price: <span className="text-fantasy-gold font-bold">{item.price}</span> Hunt Tokens
                      </div>
                      {item.owned ? (
                        <div className="text-green-400 font-semibold">✓ Owned</div>
                      ) : (
                        <Button
                          onClick={() => handlePurchase(item)}
                          disabled={purchasing === item.id || user.huntTokens < item.price}
                          className="bg-fantasy-gold text-black hover:bg-fantasy-amber"
                        >
                          {purchasing === item.id ? 'Purchasing...' : 'Purchase'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Monster Genes Section */}
          <div>
            <h2 className="text-2xl font-bold text-fantasy-amber mb-4">Monster Genes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.filter(item => item.type === 'monster').map(item => (
                <Card key={item.id} className="black-bg border-fantasy-gold">
                  <CardHeader>
                    <CardTitle className="text-fantasy-gold">{item.name}</CardTitle>
                    <CardDescription className="text-fantasy-moonlight">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-fantasy-amber">
                        Price: <span className="text-fantasy-gold font-bold">{item.price}</span> Hunt Tokens
                      </div>
                      {item.owned ? (
                        <div className="text-green-400 font-semibold">✓ Unlocked</div>
                      ) : (
                        <Button
                          onClick={() => handlePurchase(item)}
                          disabled={purchasing === item.id || user.huntTokens < item.price}
                          className="bg-fantasy-gold text-black hover:bg-fantasy-amber"
                        >
                          {purchasing === item.id ? 'Purchasing...' : 'Purchase'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
