"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/userStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WalletManager } from '@/lib/wallet'
import { useToast } from '@/hooks/use-toast'

interface Match {
  _id: string
  uniqueId: string
  gameMode: string
  status: string
  players: Array<{ _id: string; username: string }>
  winner?: { _id: string; username: string }
  createdAt: string
  completedAt?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const user = useUserStore()
  const { toast } = useToast()
  const [matches, setMatches] = useState<Match[]>([])
  const [loadingMatches, setLoadingMatches] = useState(true)
  const [matchesError, setMatchesError] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [hbdAmount, setHbdAmount] = useState('')
  const [exchanging, setExchanging] = useState(false)
  const [loadingUserInfo, setLoadingUserInfo] = useState(true)
  const [hiveHBD, setHiveHBD] = useState<string>('0.000 HBD')
  const [vscHBD, setVscHBD] = useState<string>('0.000 HBD')
  const [loadingBalances, setLoadingBalances] = useState(false)
  const [vscAccount, setVscAccount] = useState('')
  const [loadingVscBalance, setLoadingVscBalance] = useState(false)

  useEffect(() => {
    // Wait for store to hydrate
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    // Check if user is logged in - use localStorage as fallback during hydration
    const hasUsername = user.username || localStorage.getItem("mh_playerName")
    
    if (!hasUsername) {
      router.push("/")
      return
    }

    // Fetch user info and matches
    fetchUserInfo()
    fetchMatches()
    fetchHBDBalances()
  }, [isHydrated, user.username])

  const fetchHBDBalances = async () => {
    const walletInfo = WalletManager.loadWalletInfo()
    if (!walletInfo || !walletInfo.username) {
      return
    }

    setLoadingBalances(true)

    try {
      // Fetch Hive HBD balance
      const hiveRes = await fetch('https://api.hive.blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'condenser_api.get_accounts',
          params: [[walletInfo.username]],
          id: 1
        })
      })

      const hiveData = await hiveRes.json()
      if (hiveData.result && hiveData.result.length > 0) {
        setHiveHBD(hiveData.result[0].hbd_balance)
      }
    } catch (error) {
      console.error('Error fetching Hive HBD balance:', error)
    } finally {
      setLoadingBalances(false)
    }
  }

  const fetchVscBalance = async () => {
    if (!vscAccount.trim()) {
      toast({
        title: "Account Required",
        description: "Please enter a VSC account name.",
        variant: "destructive",
      })
      return
    }

    setLoadingVscBalance(true)

    try {
      const vscRes = await fetch('https://api.vsc.eco/api/v1/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetBalance($account: String!) {
              findContract(id: "vs41q9c3ygynrs8hvguqwjpzr8h42qjvgj0jczzk0j7qazj23cezqy4m38veu") {
                balanceOf(account: $account, tk: "HBD")
              }
            }
          `,
          variables: {
            account: vscAccount
          }
        })
      })

      const vscData = await vscRes.json()
      if (vscData.data?.findContract?.balanceOf) {
        const balance = parseFloat(vscData.data.findContract.balanceOf) / 1000
        setVscHBD(balance.toFixed(3) + ' HBD')
        toast({
          title: "VSC Balance Loaded",
          description: `Balance for @${vscAccount}: ${balance.toFixed(3)} HBD`,
        })
      } else {
        setVscHBD('0.000 HBD')
        toast({
          title: "Account Not Found",
          description: "Could not find VSC balance for this account.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('VSC balance fetch failed:', error)
      toast({
        title: "Error",
        description: "Failed to fetch VSC balance.",
        variant: "destructive",
      })
      setVscHBD('0.000 HBD')
    } finally {
      setLoadingVscBalance(false)
    }
  }

  const fetchUserInfo = async () => {
    try {
      setLoadingUserInfo(true)

      const token = localStorage.getItem("mh_authToken")
      
      console.log('Fetching user info with token:', token ? 'Token exists' : 'No token')
      
      if (!token) {
        console.log('No token found, redirecting to login')
        router.push("/")
        return
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/profile`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      console.log('Profile fetch response status:', response.status)

      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        console.log('Token invalid (401), redirecting to login')
        localStorage.removeItem("mh_authToken")
        localStorage.removeItem("mh_playerName")
        toast({
          title: "Session Expired",
          description: "Please login again",
          variant: "destructive",
        })
        router.push("/")
        return
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Profile fetch failed:', response.status, errorText)
        throw new Error('Failed to fetch user info')
      }

      const data = await response.json()
      console.log('User info fetched successfully:', data.user.username)
      
      // Update user store with fresh data from server
      user.setUser({
        username: data.user.username,
        huntTokens: data.user.huntTokens,
        scenesBought: data.user.scenesBought,
        monsterGenes: data.user.monsterGenes,
        xp: data.user.xp,
        gamesPlayed: data.user.gamesPlayed,
        wins: data.user.wins
      })
    } catch (error) {
      console.error('Error fetching user info:', error)
      toast({
        title: "Error",
        description: "Failed to load user information",
        variant: "destructive",
      })
    } finally {
      setLoadingUserInfo(false)
    }
  }

  const fetchMatches = async () => {
    if (!user.username) return

    try {
      setLoadingMatches(true)
      setMatchesError(null)

      const token = localStorage.getItem("mh_authToken")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/matches/user/history?limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Match fetch error:', response.status, errorData)
        throw new Error(errorData.error || 'Failed to fetch matches')
      }

      const data = await response.json()
      console.log('Matches fetched successfully:', data)
      setMatches(data.matches || [])
    } catch (error) {
      console.error('Error fetching matches:', error)
      setMatchesError('Failed to load match history')
    } finally {
      setLoadingMatches(false)
    }
  }

  const handleExchange = async () => {
    if (!hbdAmount) {
      toast({
        title: "Amount Required",
        description: "Please enter the amount of HBD to exchange.",
        variant: "destructive",
      })
      return
    }

    const amount = parseFloat(hbdAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid HBD amount greater than 0.",
        variant: "destructive",
      })
      return
    }

    // Check if Hive Keychain is available
    if (!WalletManager.isHiveKeychainAvailable()) {
      toast({
        title: "Hive Keychain Not Found",
        description: "Please install the Hive Keychain extension to continue.",
        variant: "destructive",
      })
      return
    }

    // Get wallet info
    const walletInfo = WalletManager.loadWalletInfo()
    if (!walletInfo || !walletInfo.username) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Hive wallet first.",
        variant: "destructive",
      })
      return
    }

    setExchanging(true)

    try {
      // Step 1: Transfer HBD to shivsrai via Hive Keychain
      const transferResult = await WalletManager.transferHBD(
        walletInfo.username,
        'shivsrai',
        amount,
        `Monster Hunt Token Exchange - ${user.username}`
      )

      if (!transferResult.success) {
        throw new Error(transferResult.error || 'Transfer failed')
      }

      // Step 2: Call backend to credit Hunt Tokens
      const token = localStorage.getItem('mh_authToken')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/shop/exchange`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            username: user.username,
            hbdAmount: amount,
            hiveTransactionId: transferResult.transactionId
          })
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to credit tokens')
      }

      const data = await response.json()

      // Update user store with new token amount
      user.setUser({
        huntTokens: data.user.huntTokens,
        scenesBought: data.user.scenesBought,
        monsterGenes: data.user.monsterGenes,
        xp: data.user.xp,
        gamesPlayed: data.user.gamesPlayed,
        wins: data.user.wins
      })

      toast({
        title: "Exchange Successful!",
        description: data.message,
      })
      setHbdAmount('')
    } catch (error) {
      console.error('Exchange error:', error)
      toast({
        title: "Exchange Failed",
        description: error instanceof Error ? error.message : 'Failed to exchange tokens',
        variant: "destructive",
      })
    } finally {
      setExchanging(false)
    }
  }

  if (!isHydrated || !user.username || loadingUserInfo) {
    return (
      <div className="min-h-screen bg-black/80 flex items-center justify-center">
        <div className="text-fantasy-gold text-xl">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative p-4">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/profile.png')",
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
          <h1 className="text-3xl font-bold text-fantasy-gold">Player Profile</h1>
          <Button
            onClick={() => router.push('/game')}
            variant="outline"
            className="border-fantasy-gold text-fantasy-gold hover:bg-fantasy-gold hover:text-black"
          >
            Back to Game
          </Button>
        </div>

        {/* Profile Tabs */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-fantasy-gold">
            <TabsTrigger
              value="info"
              className="data-[state=active]:bg-fantasy-gold data-[state=active]:text-black"
            >
              User Information
            </TabsTrigger>
            <TabsTrigger
              value="exchange"
              className="data-[state=active]:bg-fantasy-gold data-[state=active]:text-black"
            >
              Exchange Tokens
            </TabsTrigger>
            <TabsTrigger
              value="matches"
              className="data-[state=active]:bg-fantasy-gold data-[state=active]:text-black"
            >
              Recent Matches
            </TabsTrigger>
          </TabsList>

          {/* User Information Tab */}
          <TabsContent value="info" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <Card className="black-bg border-fantasy-gold">
                <CardHeader>
                  <CardTitle className="text-fantasy-gold">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-fantasy-moonlight text-sm">Username</div>
                    <div className="text-fantasy-amber font-semibold text-lg">{user.username}</div>
                  </div>
                  <div>
                    <div className="text-fantasy-moonlight text-sm">Experience Points</div>
                    <div className="text-fantasy-amber font-semibold text-lg">{user.xp} XP</div>
                  </div>
                  <div>
                    <div className="text-fantasy-moonlight text-sm">Hunt Tokens</div>
                    <div className="text-fantasy-amber font-semibold text-lg">{user.huntTokens}</div>
                  </div>
                  <div>
                    <div className="text-fantasy-moonlight text-sm">Games Played</div>
                    <div className="text-fantasy-amber font-semibold text-lg">{user.gamesPlayed}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Wins by Role */}
              <Card className="black-bg border-fantasy-gold">
                <CardHeader>
                  <CardTitle className="text-fantasy-gold">Wins by Role</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-fantasy-moonlight">Villager</span>
                    <span className="text-fantasy-amber font-semibold">{user.wins.villager}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-fantasy-moonlight">Doctor</span>
                    <span className="text-fantasy-amber font-semibold">{user.wins.doctor}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-fantasy-moonlight">Sheriff</span>
                    <span className="text-fantasy-amber font-semibold">{user.wins.sheriff}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-fantasy-moonlight">Werewolf</span>
                    <span className="text-fantasy-amber font-semibold">{user.wins.werewolf}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-fantasy-moonlight">Vampire</span>
                    <span className="text-fantasy-amber font-semibold">{user.wins.vampire}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Monster Genes */}
              <Card className="black-bg border-fantasy-gold">
                <CardHeader>
                  <CardTitle className="text-fantasy-gold">Monster Genes</CardTitle>
                  <CardDescription className="text-fantasy-moonlight">
                    Unlocked monster types
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-fantasy-moonlight">Werewolf</span>
                    <span className={user.monsterGenes.werewolf ? "text-green-400" : "text-red-400"}>
                      {user.monsterGenes.werewolf ? "✓ Unlocked" : "✗ Locked"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-fantasy-moonlight">Vampire</span>
                    <span className={user.monsterGenes.vampire ? "text-green-400" : "text-red-400"}>
                      {user.monsterGenes.vampire ? "✓ Unlocked" : "✗ Locked"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Scenes */}
              <Card className="black-bg border-fantasy-gold">
                <CardHeader>
                  <CardTitle className="text-fantasy-gold">Scenes</CardTitle>
                  <CardDescription className="text-fantasy-moonlight">
                    Purchased game scenes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-fantasy-moonlight">Village</span>
                    <span className={user.scenesBought.village ? "text-green-400" : "text-red-400"}>
                      {user.scenesBought.village ? "✓ Owned" : "✗ Not Owned"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-fantasy-moonlight">Castle</span>
                    <span className={user.scenesBought.castle ? "text-green-400" : "text-red-400"}>
                      {user.scenesBought.castle ? "✓ Owned" : "✗ Not Owned"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Exchange Tokens Tab */}
          <TabsContent value="exchange" className="mt-6">
            <Card className="black-bg border-fantasy-gold max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-fantasy-gold">Exchange HBD for Hunt Tokens</CardTitle>
                <CardDescription className="text-fantasy-moonlight">
                  Transfer HBD to @shivsrai via Hive Keychain and receive Hunt Tokens instantly (1 HBD = 10 Hunt Tokens)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* HBD Balance Display */}
                <div className="bg-black/40 border border-fantasy-gold/50 rounded p-4 space-y-3">
                  <div className="text-fantasy-gold font-semibold text-lg mb-2">Your HBD Balances</div>
                  
                  {/* Hive Balance */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-fantasy-moonlight">Hive (L1):</span>
                      {loadingBalances ? (
                        <span className="text-fantasy-moonlight text-sm">Loading...</span>
                      ) : (
                        <span className="text-fantasy-amber font-semibold">{hiveHBD}</span>
                      )}
                    </div>
                    <Button
                      onClick={fetchHBDBalances}
                      variant="outline"
                      size="sm"
                      className="w-full border-fantasy-gold/30 text-fantasy-moonlight hover:bg-fantasy-gold/10"
                      disabled={loadingBalances}
                    >
                      {loadingBalances ? 'Refreshing...' : '🔄 Refresh Hive Balance'}
                    </Button>
                  </div>

                  <div className="border-t border-fantasy-gold/30 my-3"></div>

                  {/* VSC Balance */}
                  <div className="space-y-2">
                    <div className="text-fantasy-moonlight text-sm mb-2">VSC Network (L2)</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter VSC account"
                        value={vscAccount}
                        onChange={(e) => setVscAccount(e.target.value)}
                        className="flex-1 px-3 py-2 rounded bg-black/40 border border-fantasy-gold/30 text-fantasy-amber focus:border-fantasy-gold focus:outline-none text-sm"
                        disabled={loadingVscBalance}
                      />
                      <Button
                        onClick={fetchVscBalance}
                        variant="outline"
                        size="sm"
                        className="border-fantasy-gold/30 text-fantasy-moonlight hover:bg-fantasy-gold/10 px-4"
                        disabled={loadingVscBalance || !vscAccount.trim()}
                      >
                        {loadingVscBalance ? '...' : 'Check'}
                      </Button>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-fantasy-moonlight text-sm">VSC Balance:</span>
                      <span className="text-fantasy-amber font-semibold">{vscHBD}</span>
                    </div>
                  </div>

                  <div className="border-t border-fantasy-gold/30 pt-2 mt-2 flex justify-between items-center">
                    <span className="text-fantasy-gold font-semibold">Total Available:</span>
                    <span className="text-fantasy-gold font-bold">
                      {(parseFloat(hiveHBD) + parseFloat(vscHBD)).toFixed(3)} HBD
                    </span>
                  </div>
                </div>

                <div className="bg-fantasy-gold/10 border border-fantasy-gold/30 rounded p-4 space-y-2">
                  <div className="text-fantasy-amber font-semibold">How to Exchange:</div>
                  <ol className="text-fantasy-moonlight text-sm space-y-1 list-decimal list-inside">
                    <li>Make sure you're logged in with your Hive wallet</li>
                    <li>Enter the amount of HBD you want to exchange</li>
                    <li>Click "Exchange Tokens" button</li>
                    <li>Approve the transfer in Hive Keychain popup</li>
                    <li>Your Hunt Tokens will be credited immediately</li>
                  </ol>
                  <div className="text-fantasy-amber text-xs mt-2">
                    Exchange Rate: <span className="text-fantasy-gold font-bold">1 HBD = 10 Hunt Tokens</span>
                  </div>
                  <div className="text-fantasy-moonlight text-xs mt-2">
                    Recipient: <span className="text-fantasy-gold font-mono">@shivsrai</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-fantasy-moonlight text-sm block mb-2">
                      HBD Amount to Exchange
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0.000"
                      value={hbdAmount}
                      onChange={(e) => setHbdAmount(e.target.value)}
                      className="w-full px-4 py-2 rounded bg-black/40 border border-fantasy-gold/30 text-fantasy-amber focus:border-fantasy-gold focus:outline-none"
                      disabled={exchanging}
                    />
                    {hbdAmount && !isNaN(parseFloat(hbdAmount)) && parseFloat(hbdAmount) > 0 && (
                      <div className="text-fantasy-gold text-sm mt-1">
                        You will receive: <span className="font-bold">{Math.floor(parseFloat(hbdAmount) * 10)} Hunt Tokens</span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleExchange}
                    disabled={!hbdAmount || exchanging}
                    className="w-full bg-fantasy-gold text-black hover:bg-fantasy-amber font-semibold py-6 text-lg"
                  >
                    {exchanging ? 'Processing Transfer...' : 'Exchange Tokens'}
                  </Button>

                  <div className="text-fantasy-moonlight text-xs text-center">
                    {!WalletManager.isHiveKeychainAvailable() ? (
                      <span className="text-red-400">⚠ Hive Keychain not detected. Please install it first.</span>
                    ) : (
                      <span>✓ Hive Keychain detected</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Matches Tab */}
          <TabsContent value="matches" className="mt-6">
            <Card className="black-bg border-fantasy-gold">
              <CardHeader>
                <CardTitle className="text-fantasy-gold">Match History</CardTitle>
                <CardDescription className="text-fantasy-moonlight">
                  Your recent completed games
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingMatches ? (
                  <div className="text-center text-fantasy-moonlight py-8">
                    Loading matches...
                  </div>
                ) : matchesError ? (
                  <div className="text-center text-red-400 py-8">
                    {matchesError}
                  </div>
                ) : matches.length === 0 ? (
                  <div className="text-center text-fantasy-moonlight py-8">
                    No matches played yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matches.map((match) => {
                      const isWinner = match.winner?.username === user.username
                      return (
                        <div
                          key={match._id}
                          className="bg-black/20 border border-fantasy-gold/30 rounded p-4 hover:border-fantasy-gold transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div
                                className={`px-3 py-1 rounded text-sm font-semibold ${
                                  isWinner
                                    ? 'bg-green-500/20 text-green-400 border border-green-500'
                                    : 'bg-red-500/20 text-red-400 border border-red-500'
                                }`}
                              >
                                {isWinner ? 'Victory' : 'Defeat'}
                              </div>
                              <div className="text-fantasy-amber capitalize">
                                {match.gameMode.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                            </div>
                            <div className="text-fantasy-moonlight text-sm">
                              {new Date(match.completedAt || match.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
