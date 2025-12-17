import type { SceneGraph, SceneLocation, SceneType } from "../../../types/game"

// Village Scene Graph
// Structure: Forest <-> Village <-> Houses <-> Hiding Spots
const villageLocations = new Map<number, SceneLocation>([
  [0, { id: 0, name: "Forest", type: "spawn", description: "Monster spawn point" }],
  [1, { id: 1, name: "Village", type: "safe", description: "Central village area" }],
  [2, { id: 2, name: "House 1", type: "safe" }],
  [3, { id: 3, name: "House 2", type: "safe" }],
  [4, { id: 4, name: "House 3", type: "safe" }],
  [5, { id: 5, name: "House 4", type: "safe" }],
  [6, { id: 6, name: "House 5", type: "safe" }],
  [7, { id: 7, name: "Under Bed", type: "hiding" }],
  [8, { id: 8, name: "Behind Door", type: "hiding" }],
  [9, { id: 9, name: "In Closet", type: "hiding" }],
  [10, { id: 10, name: "Under Bed", type: "hiding" }],
  [11, { id: 11, name: "Behind Door", type: "hiding" }],
  [12, { id: 12, name: "In Closet", type: "hiding" }],
  [13, { id: 13, name: "Under Bed", type: "hiding" }],
  [14, { id: 14, name: "Behind Door", type: "hiding" }],
  [15, { id: 15, name: "In Closet", type: "hiding" }],
  [16, { id: 16, name: "Under Bed", type: "hiding" }],
  [17, { id: 17, name: "Behind Door", type: "hiding" }],
  [18, { id: 18, name: "In Closet", type: "hiding" }],
  [19, { id: 19, name: "Under Bed", type: "hiding" }],
  [20, { id: 20, name: "Behind Door", type: "hiding" }],
  [21, { id: 21, name: "In Closet", type: "hiding" }],
])

const villageAdjacency = new Map<number, number[]>([
  [0, [1]], // Forest <-> Village
  [1, [0, 2, 3, 4, 5, 6]], // Village <-> Forest, Houses
  [2, [1, 7, 8, 9]], // House 1 <-> Village, Hiding Spots
  [3, [1, 10, 11, 12]], // House 2 <-> Village, Hiding Spots
  [4, [1, 13, 14, 15]], // House 3 <-> Village, Hiding Spots
  [5, [1, 16, 17, 18]], // House 4 <-> Village, Hiding Spots
  [6, [1, 19, 20, 21]], // House 5 <-> Village, Hiding Spots
  [7, [2]], // House 1 - Under Bed <-> House 1
  [8, [2]], // House 1 - Behind Door <-> House 1
  [9, [2]], // House 1 - In Closet <-> House 1
  [10, [3]], // House 2 - Under Bed <-> House 2
  [11, [3]], // House 2 - Behind Door <-> House 2
  [12, [3]], // House 2 - In Closet <-> House 2
  [13, [4]], // House 3 - Under Bed <-> House 3
  [14, [4]], // House 3 - Behind Door <-> House 3
  [15, [4]], // House 3 - In Closet <-> House 3
  [16, [5]], // House 4 - Under Bed <-> House 4
  [17, [5]], // House 4 - Behind Door <-> House 4
  [18, [5]], // House 4 - In Closet <-> House 4
  [19, [6]], // House 5 - Under Bed <-> House 5
  [20, [6]], // House 5 - Behind Door <-> House 5
  [21, [6]], // House 5 - In Closet <-> House 5
])

// Castle Scene Graph
// Structure: Castle Outside <-> Hall <-> Floors <-> Rooms <-> Hiding Spots
const castleLocations = new Map<number, SceneLocation>([
  [0, { id: 0, name: "Castle Outside", type: "spawn", description: "Monster spawn point" }],
  [1, { id: 1, name: "Hall", type: "safe", description: "Central castle hall" }],
  [2, { id: 2, name: "Floor 1", type: "safe" }],
  [3, { id: 3, name: "Floor 2", type: "safe" }],
  [4, { id: 4, name: "Floor 3", type: "safe" }],
  // Floor 1 rooms
  [5, { id: 5, name: "Bedroom 1", type: "safe" }],
  [6, { id: 6, name: "Dining Area 1", type: "safe" }],
  [7, { id: 7, name: "Kitchen 1", type: "safe" }],
  // Floor 2 rooms
  [8, { id: 8, name: "Bedroom 2", type: "safe" }],
  [9, { id: 9, name: "Dining Area 2", type: "safe" }],
  [10, { id: 10, name: "Kitchen 2", type: "safe" }],
  // Floor 3 rooms
  [11, { id: 11, name: "Bedroom 3", type: "safe" }],
  [12, { id: 12, name: "Dining Area 3", type: "safe" }],
  [13, { id: 13, name: "Kitchen 3", type: "safe" }],
  // Hiding spots for Floor 1
  [14, { id: 14, name: "Under Bed", type: "hiding" }],
  [15, { id: 15, name: "In Closet", type: "hiding" }],
  [16, { id: 16, name: "Under Table", type: "hiding" }],
  [17, { id: 17, name: "Behind Curtain", type: "hiding" }],
  [18, { id: 18, name: "Behind Shelf", type: "hiding" }],
  [19, { id: 19, name: "In Barrel", type: "hiding" }],
  // Hiding spots for Floor 2
  [20, { id: 20, name: "Under Bed", type: "hiding" }],
  [21, { id: 21, name: "In Closet", type: "hiding" }],
  [22, { id: 22, name: "Under Table", type: "hiding" }],
  [23, { id: 23, name: "Behind Curtain", type: "hiding" }],
  [24, { id: 24, name: "Behind Shelf", type: "hiding" }],
  [25, { id: 25, name: "In Barrel", type: "hiding" }],
  // Hiding spots for Floor 3
  [26, { id: 26, name: "Under Bed", type: "hiding" }],
  [27, { id: 27, name: "In Closet", type: "hiding" }],
  [28, { id: 28, name: "Under Table", type: "hiding" }],
  [29, { id: 29, name: "Behind Curtain", type: "hiding" }],
  [30, { id: 30, name: "Behind Shelf", type: "hiding" }],
  [31, { id: 31, name: "In Barrel", type: "hiding" }],
])

const castleAdjacency = new Map<number, number[]>([
  [0, [1]], // Castle Outside <-> Hall
  [1, [0, 2, 3, 4]], // Hall <-> Castle Outside, Floors
  // Floor 1 connections
  [2, [1, 5, 6, 7]], // Floor 1 <-> Hall, Bedroom 1, Dining 1, Kitchen 1
  [5, [2, 14, 15]], // Bedroom 1 <-> Floor 1, Hiding Spots
  [6, [2, 16, 17]], // Dining 1 <-> Floor 1, Hiding Spots
  [7, [2, 18, 19]], // Kitchen 1 <-> Floor 1, Hiding Spots
  [14, [5]], // Under Bed <-> Bedroom 1
  [15, [5]], // In Closet <-> Bedroom 1
  [16, [6]], // Under Table <-> Dining 1
  [17, [6]], // Behind Curtain <-> Dining 1
  [18, [7]], // Behind Shelf <-> Kitchen 1
  [19, [7]], // In Barrel <-> Kitchen 1
  // Floor 2 connections
  [3, [1, 8, 9, 10]], // Floor 2 <-> Hall, Bedroom 2, Dining 2, Kitchen 2
  [8, [3, 20, 21]], // Bedroom 2 <-> Floor 2, Hiding Spots
  [9, [3, 22, 23]], // Dining 2 <-> Floor 2, Hiding Spots
  [10, [3, 24, 25]], // Kitchen 2 <-> Floor 2, Hiding Spots
  [20, [8]], // Under Bed <-> Bedroom 2
  [21, [8]], // In Closet <-> Bedroom 2
  [22, [9]], // Under Table <-> Dining 2
  [23, [9]], // Behind Curtain <-> Dining 2
  [24, [10]], // Behind Shelf <-> Kitchen 2
  [25, [10]], // In Barrel <-> Kitchen 2
  // Floor 3 connections
  [4, [1, 11, 12, 13]], // Floor 3 <-> Hall, Bedroom 3, Dining 3, Kitchen 3
  [11, [4, 26, 27]], // Bedroom 3 <-> Floor 3, Hiding Spots
  [12, [4, 28, 29]], // Dining 3 <-> Floor 3, Hiding Spots
  [13, [4, 30, 31]], // Kitchen 3 <-> Floor 3, Hiding Spots
  [26, [11]], // Under Bed <-> Bedroom 3
  [27, [11]], // In Closet <-> Bedroom 3
  [28, [12]], // Under Table <-> Dining 3
  [29, [12]], // Behind Curtain <-> Dining 3
  [30, [13]], // Behind Shelf <-> Kitchen 3
  [31, [13]], // In Barrel <-> Kitchen 3
])

export const SCENES: Record<SceneType, SceneGraph> = {
  village: {
    name: "Village",
    locations: villageLocations,
    adjacencyList: villageAdjacency,
    monsterStartLocation: 0,
    playersStartLocation: 1,
    backgrounds: {
      night: "village_night",
      day: "village_day",
    },
  },
  castle: {
    name: "Castle",
    locations: castleLocations,
    adjacencyList: castleAdjacency,
    monsterStartLocation: 0,
    playersStartLocation: 1,
    backgrounds: {
      night: "castle_night",
      day: "castle_day",
    },
  },
}

export function getRandomScene(): SceneType {
  const scenes: SceneType[] = Object.keys(SCENES) as SceneType[]
  return scenes[Math.floor(Math.random() * scenes.length)]
}

// Helper function to get background image for a location
export function getLocationBackground(sceneType: SceneType, locationId: number, phase: "night" | "day"): string {
  const scene = SCENES[sceneType]
  const location = scene.locations.get(locationId)
  
  if (!location) return scene.backgrounds[phase]
  
  // Map location types to background images
  switch (location.name) {
    case "Forest":
      return `forest_${phase}`
    case "Village":
    case "Hall":
      return `village_${phase}`
    default:
      // Houses and rooms show house background
      if (location.name.includes("House") || location.name.includes("Bedroom") || 
          location.name.includes("Dining") || location.name.includes("Kitchen") ||
          location.name.includes("Floor")) {
        return `house_${phase}`
      }
      // Hiding spots show black (handled in frontend)
      if (location.type === "hiding") {
        return "hiding"
      }
      return scene.backgrounds[phase]
  }
}