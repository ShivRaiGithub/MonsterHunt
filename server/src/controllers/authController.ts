import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user';

export const checkUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const existingUser = await User.findOne({ username });

    res.json({
      success: true,
      available: !existingUser
    });
  } catch (error: any) {
    console.error('Check username error:', error);
    res.status(500).json({ error: error.message || 'Failed to check username' });
  }
};

export const checkUser = async (req: Request, res: Response) => {
  try {
    const { account, platform } = req.body;

    if (!account || !platform) {
      return res.status(400).json({ 
        error: 'Account and platform are required' 
      });
    }

    console.log('Checking user with account:', account, 'platform:', platform);
    const user = await User.findOne({ 
      'userId.account': account,
      'userId.platform': platform 
    });
    console.log('Found user:', user ? {
      id: user._id,
      username: user.username,
      xp: user.xp,
      huntTokens: user.huntTokens,
      gamesPlayed: user.gamesPlayed,
      wins: user.wins,
      monsterGenes: user.monsterGenes,
      scenesBought: user.scenesBought
    } : 'not found');

    res.json({
      success: true,
      exists: !!user,
      user: user ? {
        id: user._id,
        username: user.username,
        xp: user.xp,
        huntTokens: user.huntTokens,
        gamesPlayed: user.gamesPlayed,
        wins: user.wins,
        monsterGenes: user.monsterGenes,
        scenesBought: user.scenesBought
      } : null
    });
  } catch (error: any) {
    console.error('Check user error:', error);
    res.status(500).json({ error: error.message || 'Failed to check user' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, userId } = req.body;

    if (!username || !userId || !userId.account || !userId.platform) {
      return res.status(400).json({ 
        error: 'Username, account, and platform are required' 
      });
    }

    // Check if username is already taken by another user
    const existingUser = await User.findOne({ username });
    if (existingUser && 
        (existingUser.userId.account !== userId.account || 
         existingUser.userId.platform !== userId.platform)) {
      return res.status(400).json({ 
        error: 'Username is already taken' 
      });
    }

    // Find or create user
    let user = await User.findOne({ 
      'userId.account': userId.account,
      'userId.platform': userId.platform 
    });

    if (!user) {
      // Create new user
      user = await User.create({
        username,
        userId: {
          account: userId.account,
          platform: userId.platform
        }
      });
      console.log(`New user created: ${username}`);
    } else {
      // Update username if changed
      if (user.username !== username) {
        user.username = username;
        await user.save();
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id.toString(), 
        username: user.username 
      },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '7d' }
    );

    const responseData = {
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        xp: user.xp,
        huntTokens: user.huntTokens,
        gamesPlayed: user.gamesPlayed,
        wins: user.wins,
        monsterGenes: user.monsterGenes,
        scenesBought: user.scenesBought
      }
    };
    
    console.log('Login response data:', responseData);
    res.json(responseData);
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        xp: user.xp,
        huntTokens: user.huntTokens,
        gamesPlayed: user.gamesPlayed,
        wins: user.wins,
        monsterGenes: user.monsterGenes,
        scenesBought: user.scenesBought
      }
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message || 'Failed to get profile' });
  }
};
