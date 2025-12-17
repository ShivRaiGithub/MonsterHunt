import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  uniqueId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  gameMode: {
    type: String,
    enum: ['huntNDiscuss', 'huntFury'],
    default: 'huntNDiscuss'
  },
  status: {
    type: String,
    enum: ['waiting', 'in_progress', 'completed'],
    default: 'waiting'
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  isPrivate:{
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    default: null
  }
});

const Match = mongoose.model('Match', MatchSchema);

export default Match;