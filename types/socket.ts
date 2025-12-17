import type {
  GameState,
  Player,
  Role,
  GamePhase,
  GameMode,
  MonsterType,
  SceneType,
  MonsterAction,
  CombatResult,
  GameEvent,
} from "./game"

export type { GameState, Player, Role, GamePhase, GameMode, MonsterType, SceneType, MonsterAction, CombatResult, GameEvent }

export interface ServerToClientEvents {
  "room:created": (roomId: string) => void
  "room:joined": (gameState: GameState) => void
  "room:left": () => void
  "room:error": (message: string) => void
  "game:started": () => void
  "phase:update": (phase: GamePhase, timer: number, background: string, phaseStartTime: number) => void
  "player:moved": (playerId: string, locationId: number) => void
  "combat:result": (result: CombatResult) => void
  "player:revived": (playerId: string) => void
  "vote:update": (votes: Record<string, string>) => void
  "vote:result": (eliminatedId: string | null) => void
  "game:ended": (winner: "villagers" | "monster") => void
  "chat:message": (playerId: string, message: string) => void
  "replay:monster": (actions: MonsterAction[]) => void
  "game:state": (gameState: GameState) => void
  "game:event": (event: GameEvent) => void
}

export interface ClientToServerEvents {
  "room:create": (playerName: string, gameMode: GameMode) => void
  "room:join": (roomId: string, playerName: string) => void
  "room:leave": () => void
  "game:start": () => void
  "move:to": (locationId: number) => void
  "monster:attack": (targetId: string) => void
  "sheriff:shoot": (targetId: string) => void
  "doctor:revive": (targetId: string) => void
  "vote:cast": (targetId: string) => void
  "chat:send": (message: string) => void
}