import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { UserController } from './user.controller';
import { multerUpload } from '../../config/multer.config';

const router = express.Router();

router.get('/get-me', authMiddleware, UserController.getProfile);
router.put(
  '/update-me',
  authMiddleware,
  multerUpload.single('profilePicture'),
  UserController.updateProfile
);

export const userRoutes = router;