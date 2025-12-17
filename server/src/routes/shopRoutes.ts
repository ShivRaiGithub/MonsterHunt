import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import User from '../models/user'

const router = Router()

router.post('/purchase', authenticate, async (req: Request, res: Response) => {
  try {
    const { username, itemId, itemType } = req.body

    if (!username || !itemId || !itemType) {
      return res.status(400).json({ error: 'Username, itemId, and itemType are required' })
    }

    const user = await User.findOne({ username })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    let price = 0
    let updateField: any = {}

    // Determine price and update field based on item
    if (itemType === 'scene') {
      if (itemId === 'scene_village') {
        if (user.scenesBought.village) {
          return res.status(400).json({ error: 'You already own this scene' })
        }
        price = 100
        updateField = { 'scenesBought.village': true }
      } else if (itemId === 'scene_castle') {
        if (user.scenesBought.castle) {
          return res.status(400).json({ error: 'You already own this scene' })
        }
        price = 150
        updateField = { 'scenesBought.castle': true }
      } else {
        return res.status(400).json({ error: 'Invalid scene item' })
      }
    } else if (itemType === 'monster') {
      if (itemId === 'monster_werewolf') {
        if (user.monsterGenes.werewolf) {
          return res.status(400).json({ error: 'You already own this monster gene' })
        }
        price = 200
        updateField = { 'monsterGenes.werewolf': true }
      } else if (itemId === 'monster_vampire') {
        if (user.monsterGenes.vampire) {
          return res.status(400).json({ error: 'You already own this monster gene' })
        }
        price = 250
        updateField = { 'monsterGenes.vampire': true }
      } else {
        return res.status(400).json({ error: 'Invalid monster item' })
      }
    } else {
      return res.status(400).json({ error: 'Invalid item type' })
    }

    // Check if user has enough tokens
    if (user.huntTokens < price) {
      return res.status(400).json({ error: 'Not enough Hunt Tokens' })
    }

    // Deduct tokens and grant item
    user.huntTokens -= price
    Object.assign(user, updateField)

    await user.save()

    res.json({
      success: true,
      message: 'Purchase successful',
      user: {
        huntTokens: user.huntTokens,
        scenesBought: user.scenesBought,
        monsterGenes: user.monsterGenes
      }
    })
  } catch (error: any) {
    console.error('Shop purchase error:', error)
    res.status(500).json({ error: error.message || 'Failed to process purchase' })
  }
})

router.post('/exchange', authenticate, async (req: Request, res: Response) => {
  try {
    const { username, hbdAmount, hiveTransactionId } = req.body

    if (!username || !hbdAmount || !hiveTransactionId) {
      return res.status(400).json({ error: 'Username, HBD amount, and transaction ID are required' })
    }

    // Validate HBD amount
    const amount = parseFloat(hbdAmount)
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid HBD amount' })
    }

    const user = await User.findOne({ username })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Calculate Hunt Tokens (1 HBD = 10 Hunt Tokens)
    const huntTokensToAdd = Math.floor(amount * 10)

    // Add tokens to user
    user.huntTokens += huntTokensToAdd

    await user.save()

    res.json({
      success: true,
      message: `Successfully exchanged ${hbdAmount} HBD for ${huntTokensToAdd} Hunt Tokens`,
      user: {
        huntTokens: user.huntTokens,
        scenesBought: user.scenesBought,
        monsterGenes: user.monsterGenes,
        xp: user.xp,
        gamesPlayed: user.gamesPlayed,
        wins: user.wins
      }
    })
  } catch (error: any) {
    console.error('Token exchange error:', error)
    res.status(500).json({ error: error.message || 'Failed to process exchange' })
  }
})

export default router
