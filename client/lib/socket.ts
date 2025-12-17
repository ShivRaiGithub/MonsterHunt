import { io, type Socket } from "socket.io-client"
import type { ClientToServerEvents, ServerToClientEvents } from "../../types/socket"
import { getOrCreateSocketId } from "@/client/store/socketStore"

class SocketManager {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

  connect(): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (!this.socket) {
      // Get or create a unique socket ID for this browser tab
      const socketId = getOrCreateSocketId()
      
      this.socket = io(process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001", {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        auth: {
          sessionId: socketId // Use tab-specific session ID
        },
        query: {
          sessionId: socketId // Also send as query param
        }
      })

      // Log the socket ID for debugging
      this.socket.on('connect', () => {
        console.log('Socket connected with session ID:', socketId)
      })
    }
    return this.socket
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    return this.socket
  }

  getSessionId(): string {
    return getOrCreateSocketId()
  }
}

export const socketManager = new SocketManager()
