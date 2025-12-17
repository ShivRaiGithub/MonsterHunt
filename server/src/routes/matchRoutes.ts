import { Router } from 'express';
import { 
  createMatch, 
  joinMatch, 
  startMatch, 
  completeMatch, 
  getMatch,
  getUserMatches 
} from '../controllers/matchController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/create', authenticate, createMatch);
router.post('/join', authenticate, joinMatch);
router.post('/start', authenticate, startMatch);
router.post('/complete', authenticate, completeMatch);
router.get('/user/history', authenticate, getUserMatches);
router.get('/:uniqueId', authenticate, getMatch);

export default router;
