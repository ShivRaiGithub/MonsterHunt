import type { Server, Socket } from "socket.io"
import type { GameState, Player, Role, Location, HidingSpot, CombatResult, GameEvent } from "../../../types/game.ts"
import type { ClientToServerEvents, ServerToClientEvents } from "../../../types/socket.ts"

export class GameRoom {
  private gameState: GameState
  private sockets = new Map<string, Socket>()
  private phaseTimer: NodeJS.Timeout | null = null
  private wolfMovementTimer: NodeJS.Timeout | null = null
  private nightCount = 0
  private gameEvents: GameEvent[] = []

  constructor(
    private roomId: string,
    private io: Server<ClientToServerEvents, ServerToClientEvents>,
  ) {
    this.gameState = {
      id: roomId,
      phase: "lobby",
      players: {},
      phaseTimer: 0,
      phaseStartTime: Date.now(),
      wolfActions: [],
      votes: {},
      winner: null,
      currentBackground: "wolf",
      wolfMovementEnabled: false,
      wolfLastAttackTime: 0,
      hostId: "",
      hasStarted: false,
    }
  }

  addPlayer(socket: Socket, playerName: string): void {
    const playerCount = Object.keys(this.gameState.players).length
    
    if (playerCount >= 5) {
      socket.emit("room:error", "Room is full")
      return
    }

    // Don't allow joining if game has started
    if (this.gameState.hasStarted) {
      socket.emit("room:error", "Game has already started")
      return
    }

    const player: Player = {
      id: socket.id,
      name: playerName,
      role: "villager",
      isAlive: true,
      location: "village",
      houseNumber: null,
      hidingSpot: null,
      lastAction: 0,
      health: 1,
      isHiding: false,
    }

    this.gameState.players[socket.id] = player
    this.sockets.set(socket.id, socket)

    // Set the first player as host
    if (playerCount === 0) {
      this.gameState.hostId = socket.id
    }

    socket.join(this.roomId)
    socket.emit("room:joined", this.gameState)
    this.io.to(this.roomId).emit("game:state", this.gameState)
  }

  removePlayer(playerId: string): void {
    const player = this.gameState.players[playerId]
    
    // If game has started and player is alive, mark them as dead
    if (this.gameState.hasStarted && player && player.isAlive) {
      player.isAlive = false
      player.health = 0
      
      this.addGameEvent({
        type: "player_killed",
        message: `${player.name} left the game and died`,
        affectedPlayers: [playerId],
      })
      
      // Check win condition after player death
      this.checkWinCondition()
    } else {
      // If game hasn't started, remove player completely
      delete this.gameState.players[playerId]
    }
    
    this.sockets.delete(playerId)
    
    // Broadcast updated state
    this.io.to(this.roomId).emit("game:state", this.gameState)
  }

  getPlayerCount(): number {
    return Object.keys(this.gameState.players).length
  }

  startGame(hostId: string): void {
    // Only host can start the game
    if (hostId !== this.gameState.hostId) {
      const socket = this.sockets.get(hostId)
      if (socket) {
        socket.emit("room:error", "Only the host can start the game")
      }
      return
    }

    const playerCount = Object.keys(this.gameState.players).length
    if (playerCount < 3) {
      const socket = this.sockets.get(hostId)
      if (socket) {
        socket.emit("room:error", "Need at least 3 players to start")
      }
      return
    }

    if (this.gameState.hasStarted) {
      return
    }

    this.gameState.hasStarted = true
    this.assignRoles()
    this.io.to(this.roomId).emit("game:started")
    this.startNightPhase()
  }

  private assignRoles(): void {
    const playerIds = Object.keys(this.gameState.players)
    const playerCount = playerIds.length
    let roles: Role[] = []

    // Assign roles based on player count
    if (playerCount === 3) {
      roles = ["werewolf", "villager", "villager"]
    } else if (playerCount === 4) {
      roles = ["werewolf", "sheriff", "villager", "villager"]
    } else if (playerCount === 5) {
      roles = ["werewolf", "sheriff", "doctor", "villager", "villager"]
    }

    // Shuffle roles
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[roles[i], roles[j]] = [roles[j], roles[i]]
    }

    playerIds.forEach((playerId, index) => {
      const player = this.gameState.players[playerId]
      player.role = roles[index]

      // Set health and initial position based on role
      if (player.role === "werewolf") {
        player.health = 2
        player.location = "forest"
      } else if (player.role === "sheriff") {
        player.health = 2
      }
    })
  }

  private startNightPhase(): void {
    this.nightCount++
    this.gameState.phase = "night"
    this.gameState.phaseStartTime = Date.now()
    this.gameState.phaseTimer = 60
    this.gameState.wolfActions = []
    this.gameState.votes = {}
    this.gameState.wolfMovementEnabled = false
    this.gameEvents = []

    // Set background to night version
    this.gameState.currentBackground = "village_night"

    // Reset positions for new night
    Object.values(this.gameState.players).forEach((player) => {
      if (player.role === "werewolf") {
        player.location = "forest"
        player.houseNumber = null
        player.hidingSpot = null
        player.isHiding = false
      } else if (player.isAlive) {
        player.location = "village"
        player.houseNumber = null
        player.hidingSpot = null
        player.isHiding = false
      }
    })

    // Wolf can move after 5 seconds
    this.wolfMovementTimer = setTimeout(() => {
      this.gameState.wolfMovementEnabled = true
      this.broadcastGameState()
    }, 5000)

    this.broadcastPhaseUpdate()
    this.startPhaseTimer(60000) // 60 seconds
  }

  private startDayPhase(): void {
    this.gameState.phase = "day"
    this.gameState.phaseStartTime = Date.now()
    this.gameState.phaseTimer = 60
    this.gameState.votes = {}
    this.gameState.wolfMovementEnabled = false

    // Set day background
    this.gameState.currentBackground = "village_day"

    // Reset hiding states
    Object.values(this.gameState.players).forEach((player) => {
      player.isHiding = false
    })

    // Send wolf replay to non-wolf players
    const wolfActions = [...this.gameState.wolfActions]
    Object.values(this.gameState.players).forEach((player) => {
      if (player.role !== "werewolf") {
        const socket = this.sockets.get(player.id)
        if (socket) {
          socket.emit("replay:wolf", wolfActions)
        console.log("emitted wolf replay to", player.name, wolfActions)
        }
        
      }
    })

    this.broadcastPhaseUpdate()
    this.startPhaseTimer(60000) // 60 seconds
  }

  private startPhaseTimer(duration: number): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
    }

    this.phaseTimer = setTimeout(() => {
      if (this.gameState.phase === "night") {
        this.startDayPhase()
      } else if (this.gameState.phase === "day") {
        this.processVotes()
      }
    }, duration)
  }

  private broadcastPhaseUpdate(): void {
    this.io
      .to(this.roomId)
      .emit("phase:update", this.gameState.phase, this.gameState.phaseTimer, this.gameState.currentBackground)
  }

  private broadcastGameState(): void {
    this.io.to(this.roomId).emit("game:state", this.gameState)
  }

  private addGameEvent(event: Omit<GameEvent, "id" | "timestamp">): void {
    const gameEvent: GameEvent = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      ...event,
    }
    this.gameEvents.push(gameEvent)
    this.io.to(this.roomId).emit("game:event", gameEvent)
  }

  handlePlayerMove(playerId: string, location: Location, houseNumber?: number, hidingSpot?: HidingSpot): void {
    const player = this.gameState.players[playerId]
    if (!player || !player.isAlive) return

    const now = Date.now()
    const cooldown = this.getCooldown(player)

    if (now - player.lastAction < cooldown) return

    // Validate movement rules
    if (!this.isValidMove(player, location, houseNumber, hidingSpot)) return

    // Check wolf movement restrictions
    if (player.role === "werewolf" && this.gameState.phase === "night" && !this.gameState.wolfMovementEnabled) {
      return
    }

    const previousLocation = { ...player }
    
    player.location = location
    player.houseNumber = houseNumber || null
    player.hidingSpot = hidingSpot || null
    player.lastAction = now

    // Set hiding state for room hiding spots
if (location === "house" && hidingSpot) {
  player.isHiding = true
} 
else {
  player.isHiding = false
}

    // Log wolf actions and create events
    if (player.role === "werewolf" && this.gameState.phase === "night") {
      let description = ""
      let eventType: GameEvent["type"] = "wolf_entered_village"
      
      if (location === "village" && previousLocation.location === "forest") {
        description = "Wolf entered the village"
        eventType = "wolf_entered_village"
      } else if (location === "house" && houseNumber) {
        description = `Wolf entered house ${houseNumber}`
        eventType = "wolf_entered_house"
      } else if (location === "house" && hidingSpot) {
        description = `Wolf is checking ${hidingSpot.replace("_", " ")}`
        eventType = "wolf_checking_spot"
      }

      if (description) {
        this.gameState.wolfActions.push({
          timestamp: now,
          action: "move",
          location,
          houseNumber,
          hidingSpot: hidingSpot || undefined,
          description,
        })

        // Create game event for players in the same house
        const affectedPlayers = Object.values(this.gameState.players)
          .filter(p => p.id !== playerId && p.houseNumber === houseNumber && p.isAlive)
          .map(p => p.id)

        this.addGameEvent({
          type: eventType,
          message: description,
          affectedPlayers,
          houseNumber,
          hidingSpot,
        })
      }
    }

    this.io.to(this.roomId).emit("player:moved", playerId, location, houseNumber || null, hidingSpot || null)
    this.broadcastGameState()
  }

  private getCooldown(player: Player): number {
    if (this.gameState.phase === "night") {
      if (player.role === "werewolf") {
        // Check if sheriff recently attacked (removes cooldown for 5 seconds)
        const timeSinceAttack = Date.now() - this.gameState.wolfLastAttackTime
        if (timeSinceAttack < 5000) {
          return 0
        }
        return 2000 // 2s normal cooldown
      }
      return 0 // No cooldown for others at night
    } else {
      return 2000 // 2s cooldown during day
    }
  }

private isValidMove(
  player: Player,
  location: Location,
  houseNumber?: number,
  hidingSpot?: HidingSpot
): boolean {
  // Wolf movement path validation
  if (player.role === "werewolf" && this.gameState.phase === "night") {
    if (location === "village") {
      // Wolf can go to village from forest OR from any house
      return player.location === "forest" || player.location === "house"
    }
    if (location === "house") {
      // Wolf can enter house from village or move between houses
      return player.location === "village" || player.location === "house"
    }
    if (location === "forest") {
      // Wolf can go back to forest only from village
      return player.location === "village"
    }
  }

  // Villager movement validation
  if (player.role !== "werewolf") {
    if (location === "forest") return false
    if (location === "house" && player.location !== "village" && player.location !== "house") return false
  }

  // House-specific validations
  if (location === "house") {
    if (!houseNumber || houseNumber < 1 || houseNumber > 5) return false

    // Case: just inside house, not hiding
    if (!hidingSpot) return true

    // Case: hiding spot, must already be in same house
    if (player.location === "house" && player.houseNumber === houseNumber) {
      return true
    }
  }

  // Going back to village from house
  if (location === "village" && player.location === "house") return true

  // Disallow hidingSpot outside house
  if (location !== "house" && hidingSpot) return false

  return true
}



  handleWolfAttack(wolfId: string, targetId: string): void {
    const wolf = this.gameState.players[wolfId]
    const target = this.gameState.players[targetId]

    if (!wolf || !target || wolf.role !== "werewolf" || !wolf.isAlive || !target.isAlive) return
    if (this.gameState.phase !== "night") return

    const now = Date.now()
    if (now - wolf.lastAction < this.getCooldown(wolf)) return

    // Check if wolf and target are in same location and hiding spot
    if (wolf.location !== target.location || 
        wolf.houseNumber !== target.houseNumber || 
        wolf.hidingSpot !== target.hidingSpot) return

    wolf.lastAction = now

    // Log wolf action
    this.gameState.wolfActions.push({
      timestamp: now,
      action: "kill",
      location: wolf.location,
      houseNumber: wolf.houseNumber || undefined,
      hidingSpot: wolf.hidingSpot || undefined,
      targetId,
      description: `Wolf killed ${target.name}`,
    })

    const result = this.processCombat(wolfId, targetId, 1, "wolf_attack")
    this.io.to(this.roomId).emit("combat:result", result)

    if (result.killed) {
      this.addGameEvent({
        type: "player_killed",
        message: `${target.name} was killed by the werewolf`,
        affectedPlayers: [targetId],
      })
    }

    this.checkWinCondition()
  }

  handleWolfCheck(wolfId: string, houseNumber: number, hidingSpot?: HidingSpot): void {
    const wolf = this.gameState.players[wolfId]
    if (!wolf || wolf.role !== "werewolf" || !wolf.isAlive) return
    if (this.gameState.phase !== "night") return

    const now = Date.now()
    if (now - wolf.lastAction < this.getCooldown(wolf)) return

    wolf.lastAction = now

    let description = ""
    if (hidingSpot) {
      description = `Wolf checked ${hidingSpot.replace("_", " ")} in house ${houseNumber}`
    } else {
      description = `Wolf checked house ${houseNumber}`
    }

    this.gameState.wolfActions.push({
      timestamp: now,
      action: "check",
      location: wolf.location,
      houseNumber,
      hidingSpot,
      description,
    })

    // Notify players in the same house
    const affectedPlayers = Object.values(this.gameState.players)
      .filter(p => p.id !== wolfId && p.houseNumber === houseNumber && p.isAlive)
      .map(p => p.id)

    this.addGameEvent({
      type: "wolf_checking_spot",
      message: description,
      affectedPlayers,
      houseNumber,
      hidingSpot,
    })
  }

  handleSheriffShoot(sheriffId: string, targetId: string): void {
    const sheriff = this.gameState.players[sheriffId]
    const target = this.gameState.players[targetId]

    if (!sheriff || !target || sheriff.role !== "sheriff" || !sheriff.isAlive || !target.isAlive) return
    
    // Sheriff can only shoot during night and only werewolves
    if (this.gameState.phase !== "night") return
    if (target.role !== "werewolf") {
      const socket = this.sockets.get(sheriffId)
      if (socket) {
        socket.emit("room:error", "Sheriff can only shoot werewolves")
      }
      return
    }

    const now = Date.now()
    if (now - sheriff.lastAction < 2000) return // 2s cooldown

    sheriff.lastAction = now

    const damage = 1
    const result = this.processCombat(sheriffId, targetId, damage, "sheriff_shoot")

    // Remove wolf cooldown for 5s after sheriff's first hit on wolf
    if (target.role === "werewolf" && result.damage > 0) {
      this.gameState.wolfLastAttackTime = now
    }

    this.io.to(this.roomId).emit("combat:result", result)
    this.checkWinCondition()
  }

  handleDoctorRevive(doctorId: string, targetId: string): void {
    const doctor = this.gameState.players[doctorId]
    const target = this.gameState.players[targetId]

    if (!doctor || !target || doctor.role !== "doctor" || !doctor.isAlive) return
    if (this.gameState.phase !== "night") return
    if (target.isAlive || targetId === doctorId) return

    // Check if doctor and target are in same location
    if (doctor.location !== target.location || 
        doctor.houseNumber !== target.houseNumber ||
        doctor.hidingSpot !== target.hidingSpot) return

    target.isAlive = true
    target.health = 1

    this.addGameEvent({
      type: "player_saved",
      message: `${target.name} was saved by the doctor`,
      affectedPlayers: [targetId],
    })

    this.io.to(this.roomId).emit("player:revived", targetId)
  }

  private processCombat(attackerId: string, targetId: string, damage: number, type: CombatResult["type"]): CombatResult {
    const target = this.gameState.players[targetId]

    target.health -= damage
    const killed = target.health <= 0

    if (killed) {
      target.isAlive = false
    }

    return {
      attacker: attackerId,
      target: targetId,
      damage,
      killed,
      type,
    }
  }

  handleVote(playerId: string, targetId: string): void {
    const player = this.gameState.players[playerId]
    if (!player || !player.isAlive || this.gameState.phase !== "day") return

    this.gameState.votes[playerId] = targetId
    this.io.to(this.roomId).emit("vote:update", this.gameState.votes)

    // Check if all alive players have voted
    const alivePlayers = Object.values(this.gameState.players).filter((p) => p.isAlive)
    if (Object.keys(this.gameState.votes).length === alivePlayers.length) {
      this.processVotes()
    }
  }

private processVotes(): void {
  const voteCounts: Record<string, number> = {}

  Object.values(this.gameState.votes).forEach((targetId) => {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1
  })

  // Find player with most votes
  let maxVotes = 0
  let eliminatedId = ""
  Object.entries(voteCounts).forEach(([playerId, votes]) => {
    if (votes > maxVotes) {
      maxVotes = votes
      eliminatedId = playerId
    }
  })

  const alivePlayers = Object.values(this.gameState.players).filter((p) => p.isAlive)
  const majority = Math.floor(alivePlayers.length / 2) + 1

  if (eliminatedId && maxVotes >= majority) {
    // Eliminate only if majority is reached
    this.gameState.players[eliminatedId].isAlive = false
    this.io.to(this.roomId).emit("vote:result", eliminatedId)

    this.addGameEvent({
      type: "player_killed",
      message: `${this.gameState.players[eliminatedId].name} was eliminated by majority vote`,
      affectedPlayers: [eliminatedId],
    })
  } else {
    // No majority -> no elimination
    this.io.to(this.roomId).emit("vote:result", null)
    this.addGameEvent({
      type: "vote_failed",
      message: `No player received majority votes. No one was eliminated.`,
      affectedPlayers: [],
    })
  }

  if (this.checkWinCondition()) return

  // Start next night phase
  setTimeout(() => {
    this.startNightPhase()
  }, 3000)
}


  handleChat(playerId: string, message: string): void {
    const player = this.gameState.players[playerId]
    if (!player || !player.isAlive || this.gameState.phase !== "day") return

    this.io.to(this.roomId).emit("chat:message", playerId, message)
  }

  private checkWinCondition(): boolean {
    const alivePlayers = Object.values(this.gameState.players).filter((p) => p.isAlive)
    const aliveWolf = alivePlayers.find((p) => p.role === "werewolf")
    const aliveVillagers = alivePlayers.filter((p) => p.role !== "werewolf")

    if (!aliveWolf) {
      this.gameState.winner = "villagers"
      this.gameState.phase = "ended"
      this.io.to(this.roomId).emit("game:ended", "villagers")
      return true
    }

    if (aliveVillagers.length === 0) {
      this.gameState.winner = "werewolf"
      this.gameState.phase = "ended"
      this.io.to(this.roomId).emit("game:ended", "werewolf")
      return true
    }

    return false
  }
}
