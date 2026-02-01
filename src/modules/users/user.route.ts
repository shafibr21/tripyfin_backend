import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { UserController } from './user.controller';

const router = express.Router();

router.get('/get-me', authMiddleware, UserController.getProfile);
router.put('/update-me', authMiddleware, UserController.updateProfile );

export const userRoutes = router;