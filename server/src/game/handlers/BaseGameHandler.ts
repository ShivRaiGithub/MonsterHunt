import type { Server, Socket } from "socket.io"
import type { GameState, Player, Role, GameEvent, MonsterType, SceneType } from "../../../../types/game"
import type { ClientToServerEvents, ServerToClientEvents } from "../../../../types/socket"

export abstract class BaseGameHandler {
  protected gameState: GameState
  protected sockets = new Map<string, Socket>()
  protected phaseTimer: NodeJS.Timeout | null = null
  protected onGameEndCallback?: (roomId: string, winner: string, players: Record<string, Player>) => void

  constructor(
    protected roomId: string,
    protected io: Server<ClientToServerEvents, ServerToClientEvents>,
    protected sceneType: SceneType,
    protected monsterType: MonsterType
  ) {
    // Defer full game state initialization to subclasses so subclass
    // fields (like `scene` or `monsterConfig`) are available when
    // `initializeGameState` runs. Subclasses should call
    // `this.gameState = this.initializeGameState()` after their own
    // initializers complete.
    this.gameState = {} as unknown as GameState
  }
  
  setOnGameEndCallback(callback: (roomId: string, winner: string, players: Record<string, Player>) => void) {
    this.onGameEndCallback = callback
  }

  protected abstract initializeGameState(): GameState
  protected abstract assignRoles(): Promise<void>
  protected abstract startNightPhase(): void
  protected abstract startDayPhase(): void
  // These action handlers need to be callable from the GameManager, so
  // declare them as public in subclasses.
  public abstract handlePlayerMove(playerId: string, locationId: number): void
  public abstract handleMonsterAttack(monsterId: string, targetId: string): void
  public abstract handleSheriffShoot(sheriffId: string, targetId: string): void
  public abstract handleDoctorRevive(doctorId: string, targetId: string): void
  public abstract handleVote(playerId: string, targetId: string): void
  protected abstract checkWinCondition(): boolean

  addPlayer(socket: Socket, playerName: string): void {
    const playerCount = Object.keys(this.gameState.players).length
    
    if (playerCount >= 5) {
      socket.emit("room:error", "Room is full")
      return
    }

    if (this.gameState.hasStarted) {
      socket.emit("room:error", "Game has already started")
      return
    }

    const player: Player = {
      id: socket.id,
      name: playerName,
      role: "villager",
      isAlive: true,
      locationId: 1,
      lastAction: 0,
      health: 1,
      isHiding: false,
    }

    this.gameState.players[socket.id] = player
    this.sockets.set(socket.id, socket)

    if (playerCount === 0) {
      this.gameState.hostId = socket.id
    }

    socket.join(this.roomId)
    socket.emit("room:joined", this.gameState)
    this.io.to(this.roomId).emit("game:state", this.gameState)
  }

  removePlayer(playerId: string): void {
    const player = this.gameState.players[playerId]
    
    if (this.gameState.hasStarted && player && player.isAlive) {
      player.isAlive = false
      player.health = 0
      
      this.addGameEvent({
        type: "player_killed",
        message: `${player.name} left the game and died`,
        affectedPlayers: [playerId],
      })
      
      this.checkWinCondition()
    } else {
      delete this.gameState.players[playerId]
    }
    
    this.sockets.delete(playerId)
    this.io.to(this.roomId).emit("game:state", this.gameState)
  }

  getPlayerCount(): number {
    return Object.keys(this.gameState.players).length
  }

  async startGame(hostId: string): Promise<void> {
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
    await this.assignRoles()
    
    // Announce the monster type to all players
    const monsterTypeName = this.gameState.monsterType.charAt(0).toUpperCase() + this.gameState.monsterType.slice(1)
    this.addGameEvent({
      type: "game_start",
      message: `Game starting! The monster is a ${monsterTypeName}!`,
      affectedPlayers: [],
    })
    
    this.io.to(this.roomId).emit("game:started")
    this.startNightPhase()
  }

  handleChat(playerId: string, message: string): void {
    const player = this.gameState.players[playerId]
    if (!player || !player.isAlive || this.gameState.phase !== "day") return

    this.io.to(this.roomId).emit("chat:message", playerId, message)
  }

  protected broadcastPhaseUpdate(): void {
    this.io
      .to(this.roomId)
      .emit("phase:update", this.gameState.phase, this.gameState.phaseTimer, this.gameState.currentBackground, this.gameState.phaseStartTime)
  }

  protected broadcastGameState(): void {
    this.io.to(this.roomId).emit("game:state", this.gameState)
  }

  protected addGameEvent(event: Omit<GameEvent, "id" | "timestamp">): void {
    const gameEvent: GameEvent = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      ...event,
    }
    this.io.to(this.roomId).emit("game:event", gameEvent)
  }

  protected startPhaseTimer(duration: number, onComplete: () => void): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
    }

    this.phaseTimer = setTimeout(onComplete, duration)
  }
}