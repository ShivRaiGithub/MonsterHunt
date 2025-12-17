import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import dotenv from "dotenv"
import connectDB from "./config/database"
import authRoutes from "./routes/authRoutes"
import matchRoutes from "./routes/matchRoutes"
import shopRoutes from "./routes/shopRoutes"
import { GameManager } from "./game/GameManager"
import type { ClientToServerEvents, ServerToClientEvents } from "../../types/socket"

// Load environment variables
dotenv.config()

const app = express()
const httpServer = createServer(app)

// Connect to MongoDB
connectDB()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
)

// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/matches", matchRoutes)
app.use("/api/shop", shopRoutes)

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

const gameManager = new GameManager(io)

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`)

  socket.on("room:create", (playerName: string, gameMode: any, options?: { userId?: string, isPrivate?: boolean, password?: string, sceneType?: 'village' | 'castle' }) => {
    console.log("Player requesting room with mode:", gameMode, "name:", playerName, "options:", options)
    const roomId = gameManager.findOrCreateRoom(
      socket, 
      playerName, 
      gameMode,
      options?.userId,
      options?.isPrivate || false,
      options?.password,
      options?.sceneType
    )
    console.log("Emitting room:created event with roomId:", roomId, "to socket:", socket.id)
    socket.emit("room:created", roomId)
    console.log("Player joined/created room with ID:", roomId)
  })

  socket.on("room:join", (roomId: string, playerName: string, options?: { userId?: string, password?: string }) => {
    gameManager.joinRoom(socket, roomId, playerName, options?.userId, options?.password)
  })

  socket.on("game:start", () => {
    gameManager.startGame(socket)
  })

  socket.on("move:to", (locationId) => {
    gameManager.handleMove(socket, locationId)
  })

  socket.on("monster:attack", (targetId) => {
    gameManager.handleMonsterAttack(socket, targetId)
  })

  socket.on("sheriff:shoot", (targetId) => {
    gameManager.handleSheriffShoot(socket, targetId)
  })

  socket.on("doctor:revive", (targetId) => {
    gameManager.handleDoctorRevive(socket, targetId)
  })

  socket.on("vote:cast", (targetId) => {
    gameManager.handleVote(socket, targetId)
  })

  socket.on("chat:send", (message) => {
    gameManager.handleChat(socket, message)
  })

  socket.on("room:leave", () => {
    console.log(`Player leaving room: ${socket.id}`)
    gameManager.handleDisconnect(socket)
    socket.emit("room:left")
  })

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`)
    gameManager.handleDisconnect(socket)
  })
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`)
})