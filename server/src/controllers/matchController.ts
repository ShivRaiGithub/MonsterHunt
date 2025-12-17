import { Request, Response } from 'express';
import Match from '../models/match';
import User from '../models/user';

export const createMatch = async (req: Request, res: Response) => {
  try {
    const { roomId, uniqueId, gameMode, isPrivate, password } = req.body;
    const userId = (req as any).user.userId;

    if (!roomId || !uniqueId || !gameMode) {
      return res.status(400).json({ 
        error: 'roomId, uniqueId, and gameMode are required' 
      });
    }

    if (isPrivate && !password) {
      return res.status(400).json({ 
        error: 'Password is required for private rooms' 
      });
    }

    const match = await Match.create({
      roomId,
      uniqueId,
      gameMode,
      status: 'waiting',
      players: [userId],
      isPrivate: isPrivate || false,
      password: password || null
    });

    res.json({
      success: true,
      match: {
        id: match._id,
        roomId: match.roomId,
        uniqueId: match.uniqueId,
        gameMode: match.gameMode,
        status: match.status,
        isPrivate: match.isPrivate
      }
    });
  } catch (error: any) {
    console.error('Create match error:', error);
    res.status(500).json({ error: error.message || 'Failed to create match' });
  }
};

export const joinMatch = async (req: Request, res: Response) => {
  try {
    const { uniqueId, password } = req.body;
    const userId = (req as any).user.userId;

    if (!uniqueId) {
      return res.status(400).json({ error: 'uniqueId is required' });
    }

    const match = await Match.findOne({ uniqueId });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'waiting') {
      return res.status(400).json({ error: 'Match has already started or completed' });
    }

    if (match.isPrivate && match.password !== password) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    if (match.players.includes(userId)) {
      return res.status(400).json({ error: 'Already in this match' });
    }

    match.players.push(userId);
    await match.save();

    res.json({
      success: true,
      match: {
        id: match._id,
        roomId: match.roomId,
        uniqueId: match.uniqueId,
        gameMode: match.gameMode,
        status: match.status,
        playersCount: match.players.length
      }
    });
  } catch (error: any) {
    console.error('Join match error:', error);
    res.status(500).json({ error: error.message || 'Failed to join match' });
  }
};

export const startMatch = async (req: Request, res: Response) => {
  try {
    const { uniqueId } = req.body;

    if (!uniqueId) {
      return res.status(400).json({ error: 'uniqueId is required' });
    }

    const match = await Match.findOne({ uniqueId });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'waiting') {
      return res.status(400).json({ error: 'Match has already started or completed' });
    }

    match.status = 'in_progress';
    match.startedAt = new Date();
    await match.save();

    res.json({
      success: true,
      match: {
        id: match._id,
        uniqueId: match.uniqueId,
        status: match.status,
        startedAt: match.startedAt
      }
    });
  } catch (error: any) {
    console.error('Start match error:', error);
    res.status(500).json({ error: error.message || 'Failed to start match' });
  }
};

export const completeMatch = async (req: Request, res: Response) => {
  try {
    const { uniqueId, winners } = req.body;

    if (!uniqueId || !winners || !Array.isArray(winners)) {
      return res.status(400).json({ 
        error: 'uniqueId and winners array are required' 
      });
    }

    const match = await Match.findOne({ uniqueId }).populate('players');

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status === 'completed') {
      return res.status(400).json({ error: 'Match already completed' });
    }

    match.status = 'completed';
    match.completedAt = new Date();
    await match.save();

    // Update user stats
    for (const winnerData of winners) {
      const user = await User.findById(winnerData.userId);
      if (user) {
        user.gamesPlayed += 1;
        user.xp += 10;
        
        // Update role-specific wins
        const role = winnerData.role as keyof typeof user.wins;
        if (user.wins[role] !== undefined) {
          user.wins[role] += 1;
        }
        
        await user.save();
      }
    }

    // Update losers
    for (const player of match.players) {
      const playerId = (player as any)._id || player;
      if (!winners.find((w: any) => w.userId === playerId.toString())) {
        const user = await User.findById(playerId);
        if (user) {
          user.gamesPlayed += 1;
          await user.save();
        }
      }
    }

    res.json({
      success: true,
      match: {
        id: match._id,
        uniqueId: match.uniqueId,
        status: match.status,
        completedAt: match.completedAt
      }
    });
  } catch (error: any) {
    console.error('Complete match error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete match' });
  }
};

export const getMatch = async (req: Request, res: Response) => {
  try {
    const { uniqueId } = req.params;

    const match = await Match.findOne({ uniqueId }).populate('players', 'username xp');

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({
      success: true,
      match
    });
  } catch (error: any) {
    console.error('Get match error:', error);
    res.status(500).json({ error: error.message || 'Failed to get match' });
  }
};

export const getUserMatches = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = parseInt(req.query.skip as string) || 0;

    const matches = await Match.find({ 
      players: userId,
      status: 'completed'
    })
      .sort({ completedAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('players', 'username')
      .populate('winner', 'username');

    const totalMatches = await Match.countDocuments({ 
      players: userId,
      status: 'completed'
    });

    res.json({
      success: true,
      matches,
      total: totalMatches,
      hasMore: skip + matches.length < totalMatches
    });
  } catch (error: any) {
    console.error('Get user matches error:', error);
    res.status(500).json({ error: error.message || 'Failed to get user matches' });
  }
};
