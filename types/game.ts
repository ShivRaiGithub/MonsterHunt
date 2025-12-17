export type Role = "monster" | "sheriff" | "doctor" | "villager"

export type GamePhase = "lobby" | "night" | "day" | "ended"

export type GameMode = "huntAndDiscuss" | "huntFury" // Add more modes here

export type MonsterType = "werewolf" | "vampire" // Add more monsters here

export type SceneType = "village" | "castle" // Add more scenes here

export interface Player {
  id: string
  name: string
  role: Role
  isAlive: boolean
  locationId: number
  lastAction: number
  health: number
  isHiding: boolean
  walletType?: "hive-keychain" | "vsc-chain" | null
  walletAddress?: string
}

export interface SerializedSceneGraph {
  name: string
  locations: Record<number, SceneLocation>
  adjacencyList: Record<number, number[]>
  monsterStartLocation: number
  playersStartLocation: number
  backgrounds: {
    night: string
    day: string
  }
}

export interface GameState {
  id: string
  phase: GamePhase
  gameMode: GameMode
  sceneType: SceneType
  monsterType: MonsterType
  sceneGraph: SerializedSceneGraph
  players: Record<string, Player>
  phaseTimer: number
  phaseStartTime: number
  monsterActions: MonsterAction[]
  votes: Record<string, string>
  winner: "villagers" | "monster" | null
  currentBackground: string
  monsterMovementEnabled: boolean
  monsterLastAttackTime: number
  hostId: string
  hasStarted: boolean
}

export interface MonsterAction {
  timestamp: number
  action: "move" | "kill" | "check"
  locationId: number
  targetId?: string
  description: string
}

export interface CombatResult {
  attacker: string
  target: string
  damage: number
  killed: boolean
  type: "monster_attack" | "sheriff_shoot"
}

export interface GameEvent {
  id: string
  timestamp: number
  type: "monster_moved" | "monster_entered_location" | "player_killed" | "player_saved" | "phase_change" | "vote_failed"
  message: string
  affectedPlayers?: string[]
  locationId?: number
}

export interface SceneGraph {
  name: string
  locations: Map<number, SceneLocation>
  adjacencyList: Map<number, number[]>
  monsterStartLocation: number
  playersStartLocation: number
  backgrounds: {
    night: string
    day: string
  }
}

export interface SceneLocation {
  id: number
  name: string
  type: "safe" | "hiding" | "spawn"
  description?: string
}

export type Location = "village" | "forest" | "house"
export type HidingSpot = "bed" | "almirah" | "under_table" | "behind_door" | null
export type BackgroundType = string
export type WolfAction = MonsterAction