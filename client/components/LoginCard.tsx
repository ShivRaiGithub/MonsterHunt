// components/LoginCard.tsx
"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { GameMode } from "../../types/game"
import { WalletManager, type WalletUser } from "@/lib/wallet"
import UsernameSelection from "./UsernameSelection"
import { useUserStore } from "@/store/userStore"

type Props = {
  initialName?: string
  initialMode?: GameMode
  onSuccess?: () => void
}

export default function LoginCard({ initialName = "", initialMode = "huntAndDiscuss", onSuccess }: Props) {
  const router = useRouter()
  const setUser = useUserStore((state) => state.setUser)
  const [hiveAccount, setHiveAccount] = useState<string>("")
  const [mode, setMode] = useState<GameMode>(initialMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needUsername, setNeedUsername] = useState(false)
  const [tempHiveData, setTempHiveData] = useState<{ account: string; publicKey: string } | null>(null)

  useEffect(() => {
    // Check for existing mode
    try {
      const savedMode = localStorage.getItem("mh_mode") as GameMode | null
      if (savedMode) setMode(savedMode)
    } catch (e) {
      // ignore storage errors
    }
  }, [])

  const handleLogin = async () => {
    if (!hiveAccount.trim()) {
      setError("Please enter your Hive account")
      return
    }

    setError(null)
    setLoading(true)

    try {
      // Authenticate with Hive Keychain
      const user = await WalletManager.connectHiveKeychain(hiveAccount)
      
      // Check if user exists in database
      const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/check-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          account: user.username, 
          platform: 'hive' 
        }),
      })

      const checkData = await checkResponse.json()
      console.log('Check user response:', checkData)
      console.log('User exists:', checkData.exists)
      console.log('User data:', checkData.user)
      console.log('Username:', checkData.user?.username)

      // Check if user needs to set username (new user OR existing user without username)
      if (!checkData.exists || !checkData.user?.username || checkData.user.username.trim() === '') {
        // User needs to set username
        setTempHiveData({
          account: user.username,
          publicKey: user.publicKey || ''
        })
        setNeedUsername(true)
        setLoading(false)
        return
      }

      // Existing user with username - login to get JWT token
      const loginResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: checkData.user.username,
          userId: {
            account: user.username,
            platform: 'hive'
          }
        }),
      })

      if (!loginResponse.ok) {
        throw new Error('Failed to login')
      }

      const loginData = await loginResponse.json()
      console.log('Login response received:', loginData)
      const userData = loginData.user
      console.log('User data from login:', userData)
      
      // Save token and data (for both custom keys and AuthContext)
      localStorage.setItem("mh_authToken", loginData.token)
      localStorage.setItem("token", loginData.token)
      localStorage.setItem("user", JSON.stringify(userData))
      localStorage.setItem("mh_playerName", userData.username)
      localStorage.setItem("mh_mode", mode)
      WalletManager.saveWalletInfo(user)
      
      // Save to Zustand store
      const userStoreData = {
        username: userData.username,
        account: user.username,
        platform: 'hive',
        xp: userData.xp,
        huntTokens: userData.huntTokens,
        gamesPlayed: userData.gamesPlayed,
        wins: userData.wins,
        monsterGenes: userData.monsterGenes,
        scenesBought: userData.scenesBought
      };
      console.log('Saving to Zustand store:', userStoreData)
      setUser(userStoreData)
      
      // Call onSuccess callback first if provided (to close modal)
      if (onSuccess) {
        onSuccess()
      }
      
      // Redirect to game
      router.push("/game")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error connecting to Hive Keychain")
      setLoading(false)
    }
  }

  const handleUsernameSet = async (username: string) => {
    if (!tempHiveData) return

    setLoading(true)
    setError(null)

    try {
      // Create user account via login endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username,
          userId: {
            account: tempHiveData.account,
            platform: 'hive'
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create account')
      }

      const data = await response.json()
      console.log('Create user response:', data)
      const userData = data.user
      console.log('New user data:', userData)

      // Save token and data (for both custom keys and AuthContext)
      localStorage.setItem("mh_authToken", data.token)
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(userData))
      localStorage.setItem("mh_playerName", username)
      localStorage.setItem("mh_mode", mode)
      
      const user: WalletUser = {
        username: tempHiveData.account,
        publicKey: tempHiveData.publicKey,
        walletType: 'hive-keychain'
      }
      WalletManager.saveWalletInfo(user)
      
      // Save to Zustand store
      const newUserData = {
        username: userData.username,
        account: tempHiveData.account,
        platform: 'hive',
        xp: userData.xp,
        huntTokens: userData.huntTokens,
        gamesPlayed: userData.gamesPlayed,
        wins: userData.wins,
        monsterGenes: userData.monsterGenes,
        scenesBought: userData.scenesBought
      };
      console.log('Saving new user to Zustand:', newUserData)
      setUser(newUserData)

      setNeedUsername(false)
      setTempHiveData(null)
      
      // Call onSuccess callback first if provided (to close modal)
      if (onSuccess) {
        onSuccess()
      }
      
      // Redirect to game
      router.push("/game")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account")
      setLoading(false)
    }
  }

  // Show username selection for first-time users
  if (needUsername && tempHiveData) {
    return (
      <UsernameSelection
        hiveAccount={tempHiveData.account}
        publicKey={tempHiveData.publicKey}
        onUsernameSet={handleUsernameSet}
      />
    )
  }

  return (
    <Card className="black-bg border-fantasy-gold">
      <CardHeader>
        <CardTitle className="text-2xl text-fantasy-gold">Enter the Hunt</CardTitle>
        <CardDescription className="text-fantasy-moonlight">
          Enter your username and authenticate with Hive Keychain
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm block text-fantasy-amber">Hive Account</label>
          <Input
            value={hiveAccount}
            onChange={(e) => setHiveAccount(e.target.value)}
            placeholder="Enter your Hive account"
            className="bg-black/20 border-fantasy-gold text-fantasy-gold placeholder:text-fantasy-moonlight/50"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin()
              }
            }}
            autoFocus
            disabled={loading}
          />
        </div>

        <Button
          onClick={handleLogin}
          disabled={loading || !hiveAccount.trim()}
          className="w-full bg-fantasy-gold text-black hover:bg-fantasy-amber font-semibold"
        >
          {loading ? "Connecting to Hive Keychain..." : "Login with Hive Keychain"}
        </Button>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
