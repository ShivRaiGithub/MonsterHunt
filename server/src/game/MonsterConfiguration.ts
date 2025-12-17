import type { MonsterType } from "../../../types/game"

export interface MonsterConfig {
  name: string
  health: number
  cooldown: number
  movementDelay: number // Delay before monster can move at night start
}

export const MONSTERS: Record<MonsterType, MonsterConfig> = {
  werewolf: {
    name: "Werewolf",
    health: 2,
    cooldown: 2000,
    movementDelay: 10000,
  },
  vampire: {
    name: "Vampire",
    health: 2,
    cooldown: 2000,
    movementDelay: 10000,
  },
  // Add more monsters here
}

export function getRandomMonster(): MonsterType {
  const monsters: MonsterType[] = Object.keys(MONSTERS) as MonsterType[]
  return monsters[Math.floor(Math.random() * monsters.length)]
}