# Monster Hunt

A real-time multiplayer monster game with Hive and Magi Network integration.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **pnpm**
- **MongoDB** (local installation or MongoDB Atlas account)

## Project Structure

```
MonsterHunt/
├── client/          # Next.js frontend application
├── server/          # Express backend with Socket.IO
├── types/           # Shared TypeScript types
└── README.md
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ShivRaiGithub/MonsterHunt
cd MonsterHunt
```

### 2. Server Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install
# or
pnpm install

# Create .env file
cp .env.example .env  # or create manually
```

**Server Environment Variables** (`.env` in `server/` directory):

```env
PORT=3001
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/monsterhunt
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

NOTE: If facing cors issue, add client url explicitly to server/index.ts at line 28 or 29.

### 3. Client Setup

```bash
# Navigate to client directory (from root)
cd client

# Install dependencies
npm install
# or
pnpm install

# Create .env.local file
```

**Client Environment Variables** (`.env.local` in `client/` directory):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Running the Application

### Development Mode

You need to run both server and client in separate terminal windows.

#### Terminal 1 - Start the Server

```bash
cd server
npm run dev
```

The server will start on `http://localhost:3001`

#### Terminal 2 - Start the Client

```bash
cd client
npm run dev
```

The client will start on `http://localhost:3000`

### Production Build

#### Build the Client

```bash
cd client
npm run build
npm start
```

#### Run the Server

```bash
cd server
npm run build
npm start
```

## Features

- 🎮 **Multiple Game Modes**: Hunt and Discuss, Hunt Fury
- 🌙 **Real-time Gameplay**: Powered by Socket.IO
- 🎭 **Role-based Actions**: Monster, Sheriff, Doctor roles
- 💬 **In-game Chat**: Communicate with other players
- 🏆 **Match History**: Track your wins and stats
- 🛒 **Shop System**: Purchase items with Hunt Tokens
- 🔐 **Authentication**: JWT-based user authentication
- 🎨 **Dynamic Scenes**: Village and Castle environments
- 🔊 **Ambient Sound**: Immersive audio experience

## Technology Stack

### Frontend
- **Next.js** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Socket.IO Client** - Real-time communication

### Backend
- **Express.js** - Web framework
- **Socket.IO** - WebSocket server
- **MongoDB** - Database
- **JWT** - Authentication

## Game Modes

### Hunt and Discuss
Players hide during the night phase while the monster hunts. During the day, players discuss and vote to eliminate suspects.

### Hunt Fury
Fast-paced mode where villagers hunt the monster during day (30s) and the monster hunts at night (60s). Last player standing wins!

## Deployment

### Vercel (Client)

The client is configured for Vercel deployment. Update the `.env.local` with your production API URL:

```env
NEXT_PUBLIC_API_URL=https://your-server-domain.com
```

### Server Deployment

Update the server `.env` with production values:

```env
CLIENT_URL=https://monster-hunt-seven.vercel.app
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_production_jwt_secret
NODE_ENV=production
```

The server CORS is configured to accept requests from:
- `http://localhost:3000` (development, need to add it in env)
- `https://monster-hunt-seven.vercel.app` (production)

## Troubleshooting

### Port Already in Use

If port 3001 or 3000 is already in use:

```bash
# Find and kill the process (Linux/Mac)
lsof -ti:3001 | xargs kill
lsof -ti:3000 | xargs kill

# Or use a different port in .env files
```

### MongoDB Connection Issues

- Verify your MongoDB URI is correct
- Check if your IP is whitelisted in MongoDB Atlas
- Ensure MongoDB service is running (local installation)

### CORS Errors

- Verify `CLIENT_URL` in server `.env` matches your client URL
- Check that the client's `NEXT_PUBLIC_API_URL` points to the correct server

### WebSocket Connection Failed

- Ensure the server is running before starting the client
- Check that Socket.IO ports are not blocked by firewall
- Verify CORS settings include your client domain
