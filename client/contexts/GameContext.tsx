"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect, type ReactNode } from "react"
import { socketManager } from "@/lib/socket"
import type { GameState, Player, GamePhase, BackgroundType, CombatResult, MonsterAction, GameEvent, GameMode } from "../../types/game"
import type { Socket } from "socket.io-client"
import type { ServerToClientEvents, ClientToServerEvents } from "../../types/socket"

interface GameContextState {
  gameState: GameState | null
  currentPlayer: Player | null
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null
  isConnected: boolean
  roomId: string | null
  chatMessages: Array<{ playerId: string; message: string; timestamp: number }>
  combatFeedback: CombatResult | null
  gameEvents: GameEvent[]
  monsterReplay: MonsterAction[]
  isReconnecting: boolean
}

type GameAction =
  | { type: "SET_GAME_STATE"; payload: GameState }
  | { type: "SET_CURRENT_PLAYER"; payload: Player }
  | { type: "SET_CONNECTED"; payload: boolean }
  | { type: "SET_SOCKET"; payload: Socket<ServerToClientEvents, ClientToServerEvents> }
  | { type: "SET_ROOM_ID"; payload: string }
  | { type: "ADD_CHAT_MESSAGE"; payload: { playerId: string; message: string } }
  | { type: "UPDATE_PHASE"; payload: { phase: GamePhase; timer: number; background: BackgroundType; phaseStartTime: number } }
  | { type: "PLAYER_MOVED"; payload: { playerId: string; locationId: number } }
  | { type: "COMBAT_RESULT"; payload: CombatResult }
  | { type: "PLAYER_REVIVED"; payload: string }
  | { type: "VOTE_UPDATE"; payload: Record<string, string> }
  | { type: "VOTE_RESULT"; payload: string | null }
  | { type: "GAME_ENDED"; payload: "villagers" | "monster" | null }
  | { type: "MONSTER_REPLAY"; payload: MonsterAction[] }
  | { type: "ADD_GAME_EVENT"; payload: GameEvent }
  | { type: "SET_RECONNECTING"; payload: boolean }
  | { type: "CLEAR_COMBAT_FEEDBACK" }
  | { type: "CLEAR_GAME_EVENTS" }
  | { type: "RESET_GAME" }

const initialState: GameContextState = {
  gameState: null,
  currentPlayer: null,
  socket: null,
  isConnected: false,
  roomId: null,
  chatMessages: [],
  combatFeedback: null,
  gameEvents: [],
  monsterReplay: [],
  isReconnecting: false,
}

function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case "SET_GAME_STATE":
      return {
        ...state,
        gameState: action.payload,
        currentPlayer: action.payload.players[state.socket?.id || ""] || null,
      }
    case "SET_CURRENT_PLAYER":
      return { ...state, currentPlayer: action.payload }
    case "SET_CONNECTED":
      return { ...state, isConnected: action.payload, isReconnecting: false }
    case "SET_ROOM_ID":
      return { ...state, roomId: action.payload }
      case "SET_SOCKET":
  return { ...state, socket: action.payload }

    case "ADD_CHAT_MESSAGE":
      return {
        ...state,
        chatMessages: [...state.chatMessages, { ...action.payload, timestamp: Date.now() }],
      }
    case "UPDATE_PHASE":
      return {
        ...state,
        gameState: state.gameState
          ? {
              ...state.gameState,
              phase: action.payload.phase,
              phaseTimer: action.payload.timer,
              currentBackground: action.payload.background,
              phaseStartTime: action.payload.phaseStartTime,
            }
          : null,
      }
    case "PLAYER_MOVED":
      if (!state.gameState) return state
      return {
        ...state,
        gameState: {
          ...state.gameState,
          players: {
            ...state.gameState.players,
            [action.payload.playerId]: {
              ...state.gameState.players[action.payload.playerId],
              locationId: action.payload.locationId,
            },
          },
        },
      }
    case "COMBAT_RESULT":
      const combatId = `combat-${Date.now()}-${Math.random()}`
      let updatedGameState = state.gameState

      if (updatedGameState && action.payload.killed) {
        updatedGameState = {
          ...updatedGameState,
          players: {
            ...updatedGameState.players,
            [action.payload.target]: {
              ...updatedGameState.players[action.payload.target],
              isAlive: false,
              health: 0,
            },
          },
        }
      } else if (updatedGameState) {
        updatedGameState = {
          ...updatedGameState,
          players: {
            ...updatedGameState.players,
            [action.payload.target]: {
              ...updatedGameState.players[action.payload.target],
              health: Math.max(0, updatedGameState.players[action.payload.target].health - action.payload.damage),
            },
          },
        }
      }

      return {
        ...state,
        gameState: updatedGameState,
        currentPlayer: updatedGameState?.players[state.socket?.id || ""] || state.currentPlayer,
        combatFeedback: action.payload,
      }
    case "PLAYER_REVIVED":
      if (!state.gameState) return state
      return {
        ...state,
        gameState: {
          ...state.gameState,
          players: {
            ...state.gameState.players,
            [action.payload]: {
              ...state.gameState.players[action.payload],
              isAlive: true,
              health: 1,
            },
          },
        },
        gameEvents: [
          ...state.gameEvents,
          {
            id: `revive-${Date.now()}`,
            timestamp: Date.now(),
            type: "player_saved",
            message: `${state.gameState.players[action.payload]?.name} has been revived!`,
          },
        ],
      }
    case "VOTE_UPDATE":
      if (!state.gameState) return state
      return {
        ...state,
        gameState: {
          ...state.gameState,
          votes: action.payload,
        },
      }
    case "VOTE_RESULT":
      if (!state.gameState) return state
      
      if (action.payload === null) {
        // No elimination
        return {
          ...state,
          gameEvents: [
            ...state.gameEvents,
            {
              id: `vote-failed-${Date.now()}`,
              timestamp: Date.now(),
              type: "vote_failed",
              message: `No player received majority votes. No one was eliminated.`,
            },
          ],
        }
      }
      
      const eliminatedPlayer = state.gameState.players[action.payload]
      return {
        ...state,
        gameState: {
          ...state.gameState,
          players: {
            ...state.gameState.players,
            [action.payload]: {
              ...eliminatedPlayer,
              isAlive: false,
            },
          },
        },
        gameEvents: [
          ...state.gameEvents,
          {
            id: `eliminate-${Date.now()}`,
            timestamp: Date.now(),
            type: "player_killed",
            message: `${eliminatedPlayer?.name} has been eliminated by vote!`,
          },
        ],
      }
    case "GAME_ENDED":
      if (!state.gameState) return state
      return {
        ...state,
        gameState: {
          ...state.gameState,
          winner: action.payload,
          phase: "ended",
        },
        gameEvents: [
          ...state.gameEvents,
          {
            id: `game-end-${Date.now()}`,
            timestamp: Date.now(),
            type: "phase_change",
            message: `Game Over! ${action.payload === "monster" ? "Monster" : "Villagers"} win!`,
          },
        ],
      }
    case "MONSTER_REPLAY":
      return {
        ...state,
        monsterReplay: action.payload,
      }
    case "ADD_GAME_EVENT":
      return {
        ...state,
        gameEvents: [...state.gameEvents, action.payload],
      }
    case "SET_RECONNECTING":
      return { ...state, isReconnecting: action.payload }
    case "CLEAR_COMBAT_FEEDBACK":
      return { ...state, combatFeedback: null }
    case "CLEAR_GAME_EVENTS":
      return { ...state, gameEvents: [], monsterReplay: [], chatMessages: [] }
    case "RESET_GAME":
      return { ...initialState, socket: state.socket, isConnected: state.isConnected }
    default:
      return state
  }
}

const GameContext = createContext<{
  state: GameContextState
  dispatch: React.Dispatch<GameAction>
  actions: {
    createRoom: (playerName: string, gameMode: GameMode, options?: { userId?: string; isPrivate?: boolean; password?: string; sceneType?: 'village' | 'castle' }) => Promise<string>
    joinRoom: (roomId: string, playerName: string, options?: { userId?: string; password?: string }) => Promise<void>
    startGame: () => void
    moveToLocation: (locationId: number) => void
    monsterAttack: (targetId: string) => void
    sheriffShoot: (targetId: string) => void
    doctorRevive: (targetId: string) => void
    castVote: (targetId: string) => void
    sendChat: (message: string) => void
    clearCombatFeedback: () => void
  }
} | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  useEffect(() => {
    const socket = socketManager.connect()
    dispatch({ type: "SET_SOCKET", payload: socket })

    socket.on("connect", () => {
      dispatch({ type: "SET_CONNECTED", payload: true })
      console.log("[v0] Socket connected")
    })

    socket.on("disconnect", () => {
      dispatch({ type: "SET_CONNECTED", payload: false })
      dispatch({ type: "SET_RECONNECTING", payload: true })
      console.log("[v0] Socket disconnected, attempting to reconnect...")
    })

    socket.on("room:joined", (gameState) => {
      dispatch({ type: "CLEAR_GAME_EVENTS" })
      dispatch({ type: "SET_GAME_STATE", payload: gameState })
      dispatch({ type: "SET_ROOM_ID", payload: gameState.id })
      console.log("[v0] Joined room:", gameState.id)
    })

    socket.on("room:error", (message) => {
      console.error("[v0] Room error:", message)
    })

    socket.on("phase:update", (phase, timer, background, phaseStartTime) => {
      dispatch({ type: "UPDATE_PHASE", payload: { phase, timer, background, phaseStartTime } })
      dispatch({
        type: "ADD_GAME_EVENT",
        payload: {
          id: `phase-${Date.now()}`,
          timestamp: Date.now(),
          type: "phase_change",
          message: `${phase.charAt(0).toUpperCase() + phase.slice(1)} phase started (${timer}s)`,
        },
      })
      console.log("[v0] Phase updated:", phase, timer, background, phaseStartTime)
    })

    socket.on("game:state", (gameState) => {
      dispatch({ type: "SET_GAME_STATE", payload: gameState })
      console.log("[v0] Game state updated")
    })

    socket.on("game:started", () => {
      console.log("[v0] Game has been started by host")
    })

    socket.on("player:moved", (playerId: string, locationId: number) => {
      dispatch({ type: "PLAYER_MOVED", payload: { playerId, locationId } })
      console.log("[v0] Player moved:", playerId, locationId)
    })

    socket.on("combat:result", (result) => {
      dispatch({ type: "COMBAT_RESULT", payload: result })
      console.log("[v0] Combat result:", result)
    })

    socket.on("player:revived", (playerId) => {
      dispatch({ type: "PLAYER_REVIVED", payload: playerId })
      console.log("[v0] Player revived:", playerId)
    })

    socket.on("vote:update", (votes) => {
      dispatch({ type: "VOTE_UPDATE", payload: votes })
      console.log("[v0] Votes updated:", votes)
    })

    socket.on("vote:result", (eliminatedId) => {
      dispatch({ type: "VOTE_RESULT", payload: eliminatedId })
      console.log("[v0] Vote result:", eliminatedId)
    })

    socket.on("game:ended", (winner) => {
      dispatch({ type: "GAME_ENDED", payload: winner })
      console.log("[v0] Game ended, winner:", winner)
    })

    socket.on("chat:message", (playerId, message) => {
      dispatch({ type: "ADD_CHAT_MESSAGE", payload: { playerId, message } })
      console.log("[v0] Chat message:", playerId, message)
    })

    socket.on("replay:monster", (actions: MonsterAction[]) => {
      console.log("Here received monster replay actions:", actions) // Debug log
      dispatch({ type: "MONSTER_REPLAY", payload: actions })
      dispatch({
        type: "ADD_GAME_EVENT",
        payload: {
          id: `replay-${Date.now()}`,
          timestamp: Date.now(),
          type: "phase_change",
          message: `Monster's actions from last night revealed (${actions.length} actions)`,
        },
      })
      console.log("[v0] Monster replay received:", actions)
    })

    socket.on("game:event", (event) => {
      dispatch({ type: "ADD_GAME_EVENT", payload: event })
      console.log("[v0] Game event:", event)
    })

    const feedbackInterval = setInterval(() => {
      dispatch({ type: "CLEAR_COMBAT_FEEDBACK" })
    }, 5000)

    return () => {
      clearInterval(feedbackInterval)
      socketManager.disconnect()
    }
  }, [])

  const actions = {
    createRoom: (playerName: string, gameMode: GameMode, options?: { userId?: string; isPrivate?: boolean; password?: string; sceneType?: 'village' | 'castle' }) => {
      return new Promise<string>((resolve, reject) => {
        if (!state.socket) {
          console.error("[v0] Socket not initialized")
          reject(new Error("Socket not connected"))
          return
        }

        if (!state.isConnected) {
          console.error("[v0] Socket not connected")
          reject(new Error("Socket not connected"))
          return
        }

        console.log("[v0] Creating room for:", playerName, "with game mode:", gameMode, "options:", options)
        
        // Set a timeout in case the server doesn't respond
        const timeout = setTimeout(() => {
          state.socket?.off("room:created", onRoomCreated)
          state.socket?.off("room:error", onError)
          reject(new Error("Room creation timeout"))
        }, 10000)
        
        // Listen for room created event
        const onRoomCreated = (roomId: string) => {
          clearTimeout(timeout)
          state.socket?.off("room:created", onRoomCreated)
          state.socket?.off("room:error", onError)
          console.log("[v0] Room created successfully:", roomId)
          resolve(roomId)
        }
        
        const onError = (error: string) => {
          clearTimeout(timeout)
          state.socket?.off("room:created", onRoomCreated)
          state.socket?.off("room:error", onError)
          console.error("[v0] Room creation error:", error)
          reject(new Error(error))
        }
        
        state.socket.on("room:created", onRoomCreated)
        state.socket.on("room:error", onError)
        
        state.socket.emit("room:create", playerName, gameMode, options)
      })
    },
    joinRoom: (roomId: string, playerName: string, options?: { userId?: string; password?: string }) => {
      return new Promise<void>((resolve, reject) => {
        state.socket?.emit("room:join", roomId, playerName, options)
        console.log("[v0] Joining room:", roomId, "as:", playerName, "options:", options)
        
        // Listen for room joined event
        const onRoomJoined = () => {
          state.socket?.off("room:joined", onRoomJoined)
          state.socket?.off("room:error", onError)
          resolve()
        }
        
        const onError = (error: string) => {
          state.socket?.off("room:joined", onRoomJoined)
          state.socket?.off("room:error", onError)
          reject(new Error(error))
        }
        
        state.socket?.on("room:joined", onRoomJoined)
        state.socket?.on("room:error", onError)
      })
    },
    startGame: () => {
      state.socket?.emit("game:start")
      console.log("[v0] Starting game")
    },
    moveToLocation: (locationId: number) => {
      state.socket?.emit("move:to", locationId)
      console.log("[v0] Moving to:", locationId)
    },
    sendChat: (message: string) => {
      state.socket?.emit("chat:send", message)
      console.log("[v0] Sending chat:", message)
    },
    castVote: (targetId: string) => {
      state.socket?.emit("vote:cast", targetId)
      console.log("[v0] Casting vote for:", targetId)
    },
    monsterAttack: (targetId: string) => {
      state.socket?.emit("monster:attack", targetId)
      console.log("[v0] Monster attacking:", targetId)
    },
    sheriffShoot: (targetId: string) => {
      state.socket?.emit("sheriff:shoot", targetId)
      console.log("[v0] Sheriff shooting:", targetId)
    },
    doctorRevive: (targetId: string) => {
      state.socket?.emit("doctor:revive", targetId)
      console.log("[v0] Doctor reviving:", targetId)
    },
    clearCombatFeedback: () => {
      dispatch({ type: "CLEAR_COMBAT_FEEDBACK" })
    },
  }

  return (
    <GameContext.Provider value={{ state: { ...state, socket: socketManager.getSocket() }, dispatch, actions }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGame must be used within a GameProvider")
  }
  return context
}
