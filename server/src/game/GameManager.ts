import type { Server, Socket } from "socket.io"
import { v4 as uuidv4 } from "uuid"
import type { ClientToServerEvents, ServerToClientEvents } from "../../../types/socket"
import type { GameMode } from "../../../types/game"
import { BaseGameHandler } from "./handlers/BaseGameHandler"
import { HuntAndDiscussHandler } from "./handlers/HuntAndDiscussHandler"
import { HuntFuryHandler } from "./handlers/HuntFuryHandler"
import { getRandomScene } from "./SceneConfigurtion"
import { getRandomMonster } from "./MonsterConfiguration"
import Match from "../models/match"
import User from "../models/user"

export class GameManager {
  private rooms = new Map<string, BaseGameHandler>()
  private playerRooms = new Map<string, string>()
  private roomPasswords = new Map<string, string>()
  private roomUserIds = new Map<string, string[]>() // roomId -> userId[]
  private socketToUserId = new Map<string, string>() // socketId -> userId

  constructor(private io: Server<ClientToServerEvents, ServerToClientEvents>) {}

  // Find an available room for the given game mode, or create a new one
  findOrCreateRoom(socket: Socket, playerName: string, gameMode: GameMode, userId?: string, isPrivate: boolean = false, password?: string, sceneType?: 'village' | 'castle'): string {
    // Look for an available room with the same game mode (only public rooms)
    if (!isPrivate) {
      for (const [roomId, room] of this.rooms.entries()) {
        const gameState = (room as any).gameState
        const hasPassword = this.roomPasswords.has(roomId)
        
        // Check if room matches criteria:
        // 1. Same game mode
        // 2. Not full (< 5 players)
        // 3. Game hasn't started yet
        // 4. Not a private room
        if (
          gameState &&
          gameState.gameMode === gameMode &&
          room.getPlayerCount() < 5 &&
          !gameState.hasStarted &&
          !hasPassword
        ) {
          console.log(`Player ${playerName} joining existing room ${roomId}`)
          this.playerRooms.set(socket.id, roomId)
          if (userId) {
            const roomUsers = this.roomUserIds.get(roomId) || []
            roomUsers.push(userId)
            this.roomUserIds.set(roomId, roomUsers)
            this.socketToUserId.set(socket.id, userId)
          }
          room.addPlayer(socket, playerName)
          return roomId
        }
      }
    }

    // No available room found, create a new one
    console.log(`No available room found, creating new room for ${playerName}`)
    return this.createRoom(socket, playerName, gameMode, userId, isPrivate, password, sceneType)
  }

  createRoom(socket: Socket, playerName: string, gameMode: GameMode, userId?: string, isPrivate: boolean = false, password?: string, sceneType?: 'village' | 'castle'): string {
    const roomId = uuidv4().substring(0, 6).toUpperCase()
    
    // Use provided scene or randomly select one
    const selectedScene = sceneType || getRandomScene()
    // Monster will be selected when roles are assigned based on player's unlocked monsters
    const monsterType = 'werewolf' // Default, will be updated when game starts
    
    // Create handler based on game mode
    const room = this.createGameHandler(roomId, gameMode, selectedScene, monsterType)
    
    this.rooms.set(roomId, room)
    this.playerRooms.set(socket.id, roomId)
    
    if (password && isPrivate) {
      this.roomPasswords.set(roomId, password)
    }
    
    if (userId) {
      this.roomUserIds.set(roomId, [userId])
      this.socketToUserId.set(socket.id, userId)
    }
    
    console.log(`Creating room ${roomId} with mode: ${gameMode}, scene: ${selectedScene}, monster: ${monsterType}, private: ${isPrivate}`)
    
    // Create match in database
    this.createMatchInDB(roomId, gameMode, userId, isPrivate, password)
    
    room.addPlayer(socket, playerName)
    return roomId
  }
  
  private async createMatchInDB(roomId: string, gameMode: GameMode, userId?: string, isPrivate: boolean = false, password?: string) {
    try {
      let playerIds: any[] = []
      
      if (userId) {
        // Look up user in database to get ObjectId
        const user = await User.findOne({ 
          $or: [
            { username: userId },
            { 'userId.account': userId }
          ]
        })
        
        if (user) {
          playerIds = [user._id]
        } else {
          console.warn(`User not found for userId: ${userId}`)
        }
      }

      await Match.create({
        roomId,
        uniqueId: roomId,
        gameMode: gameMode === 'huntAndDiscuss' ? 'huntNDiscuss' : 'huntFury',
        status: 'waiting',
        players: playerIds,
        isPrivate,
        ...(password && { password })
      })
      console.log(`Match ${roomId} created in database with players:`, playerIds)
    } catch (error) {
      console.error('Error creating match in database:', error)
    }
  }

  private createGameHandler(
    roomId: string, 
    gameMode: GameMode, 
    sceneType: any, 
    monsterType: any
  ): BaseGameHandler {
    let handler: BaseGameHandler
    
    switch (gameMode) {
      case "huntAndDiscuss":
        handler = new HuntAndDiscussHandler(roomId, this.io, sceneType, monsterType)
        break
      case "huntFury":
        handler = new HuntFuryHandler(roomId, this.io, sceneType, monsterType)
        break
      // Add more game modes here:
      // case "survival":
      //   handler = new SurvivalHandler(this.io, roomId, sceneType, monsterType)
      //   break
      default:
        handler = new HuntAndDiscussHandler(roomId, this.io, sceneType, monsterType)
    }
    
    // Set callback for game end
    handler.setOnGameEndCallback(this.handleGameEnd.bind(this))
    
    return handler
  }

  joinRoom(socket: Socket, roomId: string, playerName: string, userId?: string, password?: string): void {
    const room = this.rooms.get(roomId)

    if (!room) {
      socket.emit("room:error", "Room not found")
      return
    }

    if (room.getPlayerCount() >= 5) {
      socket.emit("room:error", "Room is full")
      return
    }

    // Check if room is private and requires password
    const roomPassword = this.roomPasswords.get(roomId)
    if (roomPassword && roomPassword !== password) {
      socket.emit("room:error", "Incorrect password")
      return
    }

    this.playerRooms.set(socket.id, roomId)
    
    if (userId) {
      const roomUsers = this.roomUserIds.get(roomId) || []
      if (!roomUsers.includes(userId)) {
        roomUsers.push(userId)
        this.roomUserIds.set(roomId, roomUsers)
        
        // Update match in database
        this.addPlayerToMatch(roomId, userId)
      }
      this.socketToUserId.set(socket.id, userId)
    }
    
    room.addPlayer(socket, playerName)
  }
  
  private async addPlayerToMatch(roomId: string, userId: string) {
    try {
      const match = await Match.findOne({ uniqueId: roomId })
      if (match && !match.players.includes(userId as any)) {
        match.players.push(userId as any)
        await match.save()
        console.log(`Player ${userId} added to match ${roomId}`)
      }
    } catch (error) {
      console.error('Error adding player to match:', error)
    }
  }

  startGame(socket: Socket): void {
    const roomId = this.playerRooms.get(socket.id)
    if (!roomId) return

    const room = this.rooms.get(roomId)
    if (!room) return

    // Update match status in database
    this.startMatchInDB(roomId)
    
    room.startGame(socket.id)
  }
  
  private async startMatchInDB(roomId: string) {
    try {
      const match = await Match.findOne({ uniqueId: roomId })
      if (match && match.status === 'waiting') {
        match.status = 'in_progress'
        match.startedAt = new Date()
        await match.save()
        console.log(`Match ${roomId} started in database`)
      }
    } catch (error) {
      console.error('Error starting match in database:', error)
    }
  }

  handleMove(socket: Socket, locationId: number): void {
    const roomId = this.playerRooms.get(socket.id)
    if (!roomId) return

    const room = this.rooms.get(roomId)
    if (!room) return

    room.handlePlayerMove(socket.id, locationId)
  }

  handleMonsterAttack(socket: Socket, targetId: string): void {
    const roomId = this.playerRooms.get(socket.id)
    if (!roomId) return

    const room = this.rooms.get(roomId)
    if (!room) return

    room.handleMonsterAttack(socket.id, targetId)
  }

  handleSheriffShoot(socket: Socket, targetId: string): void {
    const roomId = this.playerRooms.get(socket.id)
    if (!roomId) return

    const room = this.rooms.get(roomId)
    if (!room) return

    room.handleSheriffShoot(socket.id, targetId)
  }

  handleDoctorRevive(socket: Socket, targetId: string): void {
    const roomId = this.playerRooms.get(socket.id)
    if (!roomId) return

    const room = this.rooms.get(roomId)
    if (!room) return

    room.handleDoctorRevive(socket.id, targetId)
  }

  handleVote(socket: Socket, targetId: string): void {
    const roomId = this.playerRooms.get(socket.id)
    if (!roomId) return

    const room = this.rooms.get(roomId)
    if (!room) return

    room.handleVote(socket.id, targetId)
  }

  handleChat(socket: Socket, message: string): void {
    const roomId = this.playerRooms.get(socket.id)
    if (!roomId) return

    const room = this.rooms.get(roomId)
    if (!room) return

    room.handleChat(socket.id, message)
  }

  handleDisconnect(socket: Socket): void {
    const roomId = this.playerRooms.get(socket.id)
    if (!roomId) return

    const room = this.rooms.get(roomId)
    if (room) {
      room.removePlayer(socket.id)

      if (room.getPlayerCount() === 0) {
        this.rooms.delete(roomId)
        this.roomPasswords.delete(roomId)
        this.roomUserIds.delete(roomId)
      }
    }

    this.playerRooms.delete(socket.id)
    this.socketToUserId.delete(socket.id)
  }
  
  private async handleGameEnd(roomId: string, winner: string, players: Record<string, any>) {
    try {
      console.log(`Game ${roomId} ended. Winner: ${winner}`)
      console.log('Players:', JSON.stringify(players, null, 2))
      
      // Get match from database
      const match = await Match.findOne({ uniqueId: roomId })
      if (!match) {
        console.error(`Match ${roomId} not found in database`)
        return
      }
      
      // Update match status
      match.status = 'completed'
      match.completedAt = new Date()
      
      // Track winners for match.winner field (will set to first winner found)
      let matchWinnerId = null
      
      // Update player stats
      for (const [socketId, player] of Object.entries(players)) {
        // Get userId from socket mapping
        const userId = this.socketToUserId.get(socketId)
        
        if (!userId) {
          console.warn(`No userId found for socket ${socketId}`)
          continue
        }
        
        console.log(`Processing player ${player.name} (socket: ${socketId}, userId: ${userId}, role: ${player.role}, alive: ${player.isAlive})`)
        
        const user = await User.findOne({ 
          $or: [
            { username: userId },
            { 'userId.account': userId }
          ]
        })
        
        if (!user) {
          console.warn(`User not found in database for userId: ${userId}`)
          continue
        }
        
        // Increment games played
        user.gamesPlayed += 1
        console.log(`Incremented gamesPlayed for ${user.username}: ${user.gamesPlayed}`)
        
        // Determine if player won
        let isWinner = false
        if (winner === 'villagers') {
          // Villagers win: villager, doctor, sheriff roles win
          isWinner = ['villager', 'doctor', 'sheriff'].includes(player.role)
        } else if (winner === 'monster') {
          // Monster wins: werewolf or vampire wins
          isWinner = ['werewolf', 'vampire'].includes(player.role)
        }
        
        console.log(`Player ${player.name} winner status: ${isWinner} (team: ${winner}, role: ${player.role})`)
        
        if (isWinner) {
          // Award XP for winning (bonus if alive)
          const xpGain = player.isAlive ? 10 : 5
          user.xp += xpGain
          console.log(`Added ${xpGain} XP to ${user.username}: ${user.xp}`)
          
          // Increment role-specific wins
          const roleKey = player.role as keyof typeof user.wins
          if (user.wins[roleKey] !== undefined) {
            user.wins[roleKey] += 1
            console.log(`Incremented ${String(roleKey)} wins for ${user.username}: ${user.wins[roleKey]}`)
          }
          
          // Set match winner (first winner found)
          if (!matchWinnerId) {
            matchWinnerId = user._id
          }
        }
        
        await user.save()
        console.log(`Successfully saved stats for user ${user.username}`)
      }
      
      // Update match winner
      if (matchWinnerId) {
        match.winner = matchWinnerId
      }
      await match.save()
      
      console.log(`Match ${roomId} completed and stats updated. Winner: ${matchWinnerId}`)
    } catch (error) {
      console.error('Error handling game end:', error)
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    }
  }
}