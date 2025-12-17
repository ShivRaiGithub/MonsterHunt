"use client"

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginForm() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [account, setAccount] = useState('')
  const [platform, setPlatform] = useState('web3')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(username, { account, platform })
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Welcome to Werewolf</CardTitle>
        <CardDescription>Login or create an account to start playing</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              type="text"
              placeholder="Account Address"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              required
            />
          </div>
          <div>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="web3">Web3</option>
              <option value="ethereum">Ethereum</option>
              <option value="solana">Solana</option>
              <option value="polygon">Polygon</option>
            </select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Login / Sign Up'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
