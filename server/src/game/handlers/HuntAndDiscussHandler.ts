import type { Server, Socket } from "socket.io"
import type { GameState, Player, Role, CombatResult, MonsterType, SceneType } from "../../../../types/game"
import type { ClientToServerEvents, ServerToClientEvents } from "../../../../types/socket"
import { BaseGameHandler } from "./BaseGameHandler"
import { SCENES } from "../SceneConfigurtion"
import { MONSTERS } from "../MonsterConfiguration"
import User from "../../models/user"

export class HuntAndDiscussHandler extends BaseGameHandler {
  private monsterMovementTimer: NodeJS.Timeout | null = null
  private nightCount = 0
  private scene = SCENES[this.sceneType]
  private monsterConfig = MONSTERS[this.monsterType]
  private notifiedPlayers: Set<string> = new Set()

  constructor(
    roomId: string,
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    sceneType: SceneType,
    monsterType: MonsterType
  ) {
    super(roomId, io, sceneType, monsterType)

    // Now that subclass fields and initializers (like `scene` and
    // `monsterConfig`) have been set, initialize the full game state.
    this.gameState = this.initializeGameState()
  }

  protected initializeGameState(): GameState {
    // Serialize scene graph (convert Maps to objects for JSON transmission)
    const serializedSceneGraph = {
      name: this.scene.name,
      locations: Object.fromEntries(this.scene.locations),
      adjacencyList: Object.fromEntries(this.scene.adjacencyList),
      monsterStartLocation: this.scene.monsterStartLocation,
      playersStartLocation: this.scene.playersStartLocation,
      backgrounds: this.scene.backgrounds,
    }

    return {
      id: this.roomId,
      phase: "lobby",
      gameMode: "huntAndDiscuss",
      sceneType: this.sceneType,
      monsterType: this.monsterType,
      sceneGraph: serializedSceneGraph,
      players: {},
      phaseTimer: 0,
      phaseStartTime: Date.now(),
      monsterActions: [],
      votes: {},
      winner: null,
      currentBackground: this.scene.backgrounds.night,
      monsterMovementEnabled: false,
      monsterLastAttackTime: 0,
      hostId: "",
      hasStarted: false,
    }
  }

  protected async assignRoles(): Promise<void> {
    const playerIds = Object.keys(this.gameState.players)
    const playerCount = playerIds.length
    let roles: Role[] = []

    if (playerCount === 3) {
      roles = ["monster", "villager", "villager"]
    } else if (playerCount === 4) {
      roles = ["monster", "sheriff", "villager", "villager"]
    } else if (playerCount === 5) {
      roles = ["monster", "sheriff", "doctor", "villager", "villager"]
    }

    // Shuffle roles
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[roles[i], roles[j]] = [roles[j], roles[i]]
    }

    // Find the player who gets the monster role and select monster based on their unlocked monsters
    let monsterPlayerId: string | null = null
    for (let i = 0; i < roles.length; i++) {
      if (roles[i] === "monster") {
        monsterPlayerId = playerIds[i]
        break
      }
    }

    // If we have a monster player, look up their unlocked monsters
    if (monsterPlayerId) {
      try {
        const monsterPlayer = this.gameState.players[monsterPlayerId]
        // Try to find user by username
        const user = await User.findOne({ username: monsterPlayer.name })
        
        if (user && user.monsterGenes) {
          // Get unlocked monsters
          const unlockedMonsters: MonsterType[] = []
          if (user.monsterGenes.werewolf) unlockedMonsters.push('werewolf')
          if (user.monsterGenes.vampire) unlockedMonsters.push('vampire')
          
          // Select random monster from unlocked ones
          if (unlockedMonsters.length > 0) {
            const randomIndex = Math.floor(Math.random() * unlockedMonsters.length)
            this.monsterType = unlockedMonsters[randomIndex]
            this.monsterConfig = MONSTERS[this.monsterType]
            console.log(`Selected ${this.monsterType} for player ${monsterPlayer.name} based on unlocked monsters:`, unlockedMonsters)
          } else {
            console.log(`Player ${monsterPlayer.name} has no unlocked monsters, using default werewolf`)
          }
        } else {
          console.log(`User not found for monster player ${monsterPlayer.name}, using default werewolf`)
        }
      } catch (error) {
        console.error('Error fetching user for monster selection:', error)
      }
    }

    playerIds.forEach((playerId, index) => {
      const player = this.gameState.players[playerId]
      player.role = roles[index]

      if (player.role === "monster") {
        player.health = this.monsterConfig.health
        player.locationId = this.scene.monsterStartLocation
      } else if (player.role === "sheriff") {
        player.health = 2
        player.locationId = this.scene.playersStartLocation
      } else {
        player.locationId = this.scene.playersStartLocation
      }
    })
  }

  protected startNightPhase(): void {
    this.nightCount++
    this.gameState.phase = "night"
    this.gameState.phaseStartTime = Date.now()
    this.gameState.phaseTimer = 60
    this.gameState.monsterActions = []
    this.gameState.votes = {}
    this.gameState.monsterMovementEnabled = false
    this.notifiedPlayers.clear()

    this.gameState.currentBackground = this.scene.backgrounds.night

    // Reset positions for new night
    Object.values(this.gameState.players).forEach((player) => {
      if (player.role === "monster") {
        player.locationId = this.scene.monsterStartLocation
        player.isHiding = false
      } else if (player.isAlive) {
        player.locationId = this.scene.playersStartLocation
        player.isHiding = false
      }
    })

    // Broadcast game state immediately so players see their roles and UI
    this.broadcastGameState()
    this.broadcastPhaseUpdate()

    // Monster can move after delay
    this.monsterMovementTimer = setTimeout(() => {
      this.gameState.monsterMovementEnabled = true
      this.broadcastGameState()
    }, this.monsterConfig.movementDelay)

    this.startPhaseTimer(60000, () => this.startDayPhase())
  }

  protected startDayPhase(): void {
    // Check if game already ended before starting day phase
    if (this.checkWinCondition()) return

    this.gameState.phase = "day"
    this.gameState.phaseStartTime = Date.now()
    this.gameState.phaseTimer = 60
    this.gameState.votes = {}
    this.gameState.monsterMovementEnabled = false

    this.gameState.currentBackground = this.scene.backgrounds.day

    Object.values(this.gameState.players).forEach((player) => {
      player.isHiding = false
      // Reset all players to village spawn during discussion
      if (player.isAlive) {
        player.locationId = this.scene.playersStartLocation
      }
    })

    // Send monster replay to non-monster players
    const monsterActions = [...this.gameState.monsterActions]
    Object.values(this.gameState.players).forEach((player) => {
      if (player.role !== "monster") {
        const socket = this.sockets.get(player.id)
        if (socket) {
          socket.emit("replay:monster", monsterActions)
          console.log("emitted monster replay to", player.name, monsterActions)
        }
      }
    })

    this.broadcastPhaseUpdate()
    this.startPhaseTimer(60000, () => {
      this.processVotes()
    })
  }

  public handlePlayerMove(playerId: string, locationId: number): void {
    const player = this.gameState.players[playerId]
    if (!player || !player.isAlive) return

    const now = Date.now()
    const cooldown = this.getCooldown(player)

    if (now - player.lastAction < cooldown) return

    // Validate movement
    if (!this.isValidMove(player, locationId)) return

    // Check monster movement restrictions
    if (player.role === "monster" && this.gameState.phase === "night" && !this.gameState.monsterMovementEnabled) {
      return
    }

    const previousLocationId = player.locationId
    player.locationId = locationId
    player.lastAction = now

    // Set hiding state ONLY for hiding type locations
    const location = this.scene.locations.get(locationId)
    player.isHiding = location?.type === "hiding"

    // Log monster actions and send proximity notifications
    if (player.role === "monster" && this.gameState.phase === "night") {
      const locationName = this.scene.locations.get(locationId)?.name || "unknown"
      const description = `${this.monsterConfig.name} moved to ${locationName}`
      const currentLocation = this.scene.locations.get(locationId)

      this.gameState.monsterActions.push({
        timestamp: now,
        action: "move",
        locationId,
        description,
      })

      // Notify players in adjacent locations that monster is near (only once per night)
      const adjacentLocationIds = this.scene.adjacencyList.get(locationId) || []
      const nearbyPlayers = Object.values(this.gameState.players)
        .filter(p => 
          p.id !== playerId && 
          p.isAlive && 
          p.role !== "monster" &&
          adjacentLocationIds.includes(p.locationId) &&
          !this.notifiedPlayers.has(p.id)
        )

      nearbyPlayers.forEach(p => {
        this.notifiedPlayers.add(p.id)
        const socket = this.sockets.get(p.id)
        if (socket) {
          this.addGameEvent({
            type: "monster_moved",
            message: `${this.monsterConfig.name} is near!`,
            affectedPlayers: [p.id],
            locationId: p.locationId,
          })
        }
      })

      // Monster entering hiding spots - no additional notifications needed

      // Auto-kill non-sheriff players in same hiding spot
      if (currentLocation?.type === "hiding") {
        const victimsInHiding = Object.values(this.gameState.players)
          .filter(p => 
            p.id !== playerId && 
            p.isAlive && 
            p.locationId === locationId &&
            p.role !== "sheriff" // Sheriff survives
          )

        victimsInHiding.forEach(victim => {
          victim.isAlive = false
          victim.health = 0

          this.gameState.monsterActions.push({
            timestamp: now,
            action: "kill",
            locationId,
            targetId: victim.id,
            description: `${this.monsterConfig.name} found and killed ${victim.name} at ${locationName}`,
          })

          this.addGameEvent({
            type: "player_killed",
            message: `${victim.name} was found and killed by the ${this.monsterConfig.name}`,
            affectedPlayers: [victim.id],
          })

          const result: CombatResult = {
            attacker: playerId,
            target: victim.id,
            damage: victim.health,
            killed: true,
            type: "monster_attack",
          }
          this.io.to(this.roomId).emit("combat:result", result)
        })

        if (victimsInHiding.length > 0) {
          this.checkWinCondition()
        }
      }
    }

    this.io.to(this.roomId).emit("player:moved", playerId, locationId)
    this.broadcastGameState()
  }

  private getCooldown(player: Player): number {
    if (this.gameState.phase === "night") {
      if (player.role === "monster") {
        const timeSinceAttack = Date.now() - this.gameState.monsterLastAttackTime
        if (timeSinceAttack < 5000) {
          return 0
        }
        return this.monsterConfig.cooldown
      }
      return 0
    } else {
      return 2000
    }
  }

  private isValidMove(player: Player, targetLocationId: number): boolean {
    const adjacentLocations = this.scene.adjacencyList.get(player.locationId)
    if (!adjacentLocations) return false

    // Check if target location is adjacent
    if (!adjacentLocations.includes(targetLocationId)) return false

    // Monster-specific restrictions
    if (player.role === "monster" && this.gameState.phase === "night") {
      return true // Monster can move freely through adjacent nodes
    }

    return true
  }

  public handleMonsterAttack(monsterId: string, targetId: string): void {
    const monster = this.gameState.players[monsterId]
    const target = this.gameState.players[targetId]

    if (!monster || !target || monster.role !== "monster" || !monster.isAlive || !target.isAlive) return
    if (this.gameState.phase !== "night") return

    const now = Date.now()
    if (now - monster.lastAction < this.getCooldown(monster)) return

    // Check if monster and target are in same location
    if (monster.locationId !== target.locationId) return

    monster.lastAction = now

    const locationName = this.scene.locations.get(monster.locationId)?.name || "unknown"
    this.gameState.monsterActions.push({
      timestamp: now,
      action: "kill",
      locationId: monster.locationId,
      targetId,
      description: `${this.monsterConfig.name} killed ${target.name} at ${locationName}`,
    })

    const result = this.processCombat(monsterId, targetId, 1, "monster_attack")
    this.io.to(this.roomId).emit("combat:result", result)

    if (result.killed) {
      this.addGameEvent({
        type: "player_killed",
        message: `${target.name} was killed by the ${this.monsterConfig.name}`,
        affectedPlayers: [targetId],
      })
    }

    this.checkWinCondition()
  }

  public handleSheriffShoot(sheriffId: string, targetId: string): void {
    const sheriff = this.gameState.players[sheriffId]
    const target = this.gameState.players[targetId]

    if (!sheriff || !target || sheriff.role !== "sheriff" || !sheriff.isAlive || !target.isAlive) return
    
    if (this.gameState.phase !== "night") return
    if (target.role !== "monster") {
      const socket = this.sockets.get(sheriffId)
      if (socket) {
        socket.emit("room:error", "Sheriff can only shoot monsters")
      }
      return
    }

    const now = Date.now()
    if (now - sheriff.lastAction < 2000) return

    sheriff.lastAction = now

    const damage = 1
    const result = this.processCombat(sheriffId, targetId, damage, "sheriff_shoot")

    if (target.role === "monster" && result.damage > 0) {
      this.gameState.monsterLastAttackTime = now
    }

    this.io.to(this.roomId).emit("combat:result", result)
    this.checkWinCondition()
  }

  public handleDoctorRevive(doctorId: string, targetId: string): void {
    const doctor = this.gameState.players[doctorId]
    const target = this.gameState.players[targetId]

    if (!doctor || !target || doctor.role !== "doctor" || !doctor.isAlive) return
    if (this.gameState.phase !== "night") return
    if (target.isAlive || targetId === doctorId) return

    // Check if doctor and target are in same location
    if (doctor.locationId !== target.locationId) return

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

  public handleVote(playerId: string, targetId: string): void {
    const player = this.gameState.players[playerId]
    if (!player || !player.isAlive || this.gameState.phase !== "day") return

    this.gameState.votes[playerId] = targetId
    this.io.to(this.roomId).emit("vote:update", this.gameState.votes)

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
      this.gameState.players[eliminatedId].isAlive = false
      this.io.to(this.roomId).emit("vote:result", eliminatedId)

      this.addGameEvent({
        type: "player_killed",
        message: `${this.gameState.players[eliminatedId].name} was eliminated by majority vote`,
        affectedPlayers: [eliminatedId],
      })
    } else {
      this.io.to(this.roomId).emit("vote:result", null)
      this.addGameEvent({
        type: "vote_failed",
        message: `No player received majority votes. No one was eliminated.`,
        affectedPlayers: [],
      })
    }

    if (this.checkWinCondition()) return

    // Start next night phase after delay
    setTimeout(() => {
      if (this.gameState.phase === "day") {
        this.startNightPhase()
      }
    }, 3000)
  }

  protected checkWinCondition(): boolean {
    const alivePlayers = Object.values(this.gameState.players).filter((p) => p.isAlive)
    const aliveMonster = alivePlayers.find((p) => p.role === "monster")
    const aliveVillagers = alivePlayers.filter((p) => p.role !== "monster")

    if (!aliveMonster) {
      this.gameState.winner = "villagers"
      this.gameState.phase = "ended"
      this.io.to(this.roomId).emit("game:ended", "villagers")
      if (this.onGameEndCallback) {
        this.onGameEndCallback(this.roomId, "villagers", this.gameState.players)
      }
      return true
    }

    if (aliveVillagers.length === 0) {
      this.gameState.winner = "monster"
      this.gameState.phase = "ended"
      this.io.to(this.roomId).emit("game:ended", "monster")
      if (this.onGameEndCallback) {
        this.onGameEndCallback(this.roomId, "monster", this.gameState.players)
      }
      return true
    }

    // If only 2 players remain (1 monster, 1 villager), monster wins
    if (alivePlayers.length === 2 && aliveMonster && aliveVillagers.length === 1) {
      this.gameState.winner = "monster"
      this.gameState.phase = "ended"
      this.io.to(this.roomId).emit("game:ended", "monster")
      if (this.onGameEndCallback) {
        this.onGameEndCallback(this.roomId, "monster", this.gameState.players)
      }
      return true
    }

    return false
  }
}