import type { Server, Socket } from "socket.io"
import type { GameState, Player, Role, CombatResult, MonsterType, SceneType } from "../../../../types/game"
import type { ClientToServerEvents, ServerToClientEvents } from "../../../../types/socket"
import { BaseGameHandler } from "./BaseGameHandler"
import { SCENES } from "../SceneConfigurtion"
import { MONSTERS } from "../MonsterConfiguration"
import User from "../../models/user"

export class HuntFuryHandler extends BaseGameHandler {
  private phaseCount = 0
  private scene = SCENES[this.sceneType]
  private monsterConfig = MONSTERS[this.monsterType]
  private notifiedMonster: Set<string> = new Set()

  constructor(
    roomId: string,
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    sceneType: SceneType,
    monsterType: MonsterType
  ) {
    super(roomId, io, sceneType, monsterType)
    this.gameState = this.initializeGameState()
  }

  protected initializeGameState(): GameState {
    // Serialize scene graph
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
      gameMode: "huntFury",
      sceneType: this.sceneType,
      monsterType: this.monsterType,
      sceneGraph: serializedSceneGraph,
      players: {},
      phaseTimer: 0,
      phaseStartTime: Date.now(),
      monsterActions: [],
      votes: {},
      winner: null,
      currentBackground: this.scene.backgrounds.day,
      monsterMovementEnabled: true,
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
    this.phaseCount++
    this.gameState.phase = "night"
    this.gameState.phaseStartTime = Date.now()
    this.gameState.phaseTimer = 60
    this.gameState.monsterActions = []
    this.gameState.votes = {}
    this.gameState.monsterMovementEnabled = true // Monster always enabled
    this.notifiedMonster.clear()

    this.gameState.currentBackground = this.scene.backgrounds.night

    // Reset positions for night phase
    Object.values(this.gameState.players).forEach((player) => {
      if (player.role === "monster") {
        player.locationId = this.scene.monsterStartLocation
        player.isHiding = false
      } else if (player.isAlive) {
        player.locationId = this.scene.playersStartLocation
        player.isHiding = false
      }
    })

    this.broadcastPhaseUpdate()
    this.broadcastGameState()
    this.startPhaseTimer(60000, () => this.startDayPhase())
  }

  protected startDayPhase(): void {
    // Check if game already ended
    if (this.checkWinCondition()) return

    this.gameState.phase = "day"
    this.gameState.phaseStartTime = Date.now()
    this.gameState.phaseTimer = 30 // 30 seconds for hunt phase
    this.gameState.votes = {}
    this.gameState.monsterMovementEnabled = true
    this.notifiedMonster.clear()

    this.gameState.currentBackground = this.scene.backgrounds.day

    // Reset all players to spawn for hunt phase
    Object.values(this.gameState.players).forEach((player) => {
      player.isHiding = false
      if (player.isAlive) {
        if (player.role === "monster") {
          player.locationId = this.scene.monsterStartLocation
        } else {
          player.locationId = this.scene.playersStartLocation
        }
      }
    })

    this.broadcastPhaseUpdate()
    this.broadcastGameState()
    this.startPhaseTimer(30000, () => {
      // After 30 seconds, go back to night phase
      if (this.gameState.phase === "day") {
        this.startNightPhase()
      }
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

    const previousLocationId = player.locationId
    player.locationId = locationId
    player.lastAction = now

    // Set hiding state
    const location = this.scene.locations.get(locationId)
    player.isHiding = location?.type === "hiding"

    // In HuntFury mode, notify MONSTER when villagers are near during day phase
    if (player.role !== "monster" && this.gameState.phase === "day") {
      const adjacentLocationIds = this.scene.adjacencyList.get(locationId) || []
      const monsterNearby = Object.values(this.gameState.players)
        .filter(p => 
          p.role === "monster" && 
          p.isAlive && 
          adjacentLocationIds.includes(p.locationId) &&
          !this.notifiedMonster.has(p.id)
        )

      monsterNearby.forEach(monster => {
        this.notifiedMonster.add(monster.id)
        const socket = this.sockets.get(monster.id)
        if (socket) {
          this.addGameEvent({
            type: "monster_moved",
            message: `${player.name} is near!`,
            affectedPlayers: [monster.id],
            locationId: monster.locationId,
          })
        }
      })
    }

    // Log monster actions during night
    if (player.role === "monster" && this.gameState.phase === "night") {
      const locationName = this.scene.locations.get(locationId)?.name || "unknown"
      const description = `${this.monsterConfig.name} moved to ${locationName}`

      this.gameState.monsterActions.push({
        timestamp: now,
        action: "move",
        locationId,
        description,
      })

      // Auto-kill non-sheriff players in hiding spots during night
      const currentLocation = this.scene.locations.get(locationId)
      if (currentLocation?.type === "hiding") {
        const victimsInHiding = Object.values(this.gameState.players)
          .filter(p => 
            p.id !== playerId && 
            p.isAlive && 
            p.locationId === locationId &&
            p.role !== "sheriff"
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
      // Night phase: Monster has 2s cooldown, villagers have no cooldown
      if (player.role === "monster") {
        return this.monsterConfig.cooldown
      }
      return 0
    } else {
      // Day phase (hunt): Villagers have 2s cooldown, monster has no cooldown
      if (player.role === "monster") {
        return 0
      }
      return 2000
    }
  }

  private isValidMove(player: Player, targetLocationId: number): boolean {
    const adjacentLocations = this.scene.adjacencyList.get(player.locationId)
    if (!adjacentLocations) return false

    if (!adjacentLocations.includes(targetLocationId)) return false

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

    // Sheriff deals 2x damage during day phase (hunt), 1x during night
    const damage = this.gameState.phase === "day" ? 2 : 1
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

  public handleVote(playerId: string, targetId: string): void {
    // No voting in HuntFury mode
    return
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

  protected checkWinCondition(): boolean {
    const alivePlayers = Object.values(this.gameState.players).filter((p) => p.isAlive)
    const aliveMonster = alivePlayers.find((p) => p.role === "monster")
    const aliveVillagers = alivePlayers.filter((p) => p.role !== "monster")

    // Game continues until only 1 player remains
    if (alivePlayers.length === 1) {
      if (aliveMonster) {
        this.gameState.winner = "monster"
      } else {
        this.gameState.winner = "villagers"
      }
      this.gameState.phase = "ended"
      this.io.to(this.roomId).emit("game:ended", this.gameState.winner)
      if (this.onGameEndCallback) {
        this.onGameEndCallback(this.roomId, this.gameState.winner, this.gameState.players)
      }
      return true
    }

    // Also end if monster dies
    if (!aliveMonster) {
      this.gameState.winner = "villagers"
      this.gameState.phase = "ended"
      this.io.to(this.roomId).emit("game:ended", "villagers")
      if (this.onGameEndCallback) {
        this.onGameEndCallback(this.roomId, "villagers", this.gameState.players)
      }
      return true
    }

    // Also end if all villagers die
    if (aliveVillagers.length === 0) {
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
