import { Router } from 'express';
import { login, getProfile, checkUsername, checkUser } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/check-username', checkUsername);
router.post('/check-user', checkUser);
router.get('/profile', authenticate, getProfile);

export default router;
