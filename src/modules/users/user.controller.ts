import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { uploadBufferToCloudinary } from '../../config/cloudinary.config';

const getProfile = async (req: Request, res: Response) => {
  const user = req.user;
  return res.json({ success: true, data: user });
};

const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userDoc: any = req.user;
    const userId = userDoc && (userDoc._id || userDoc.id);
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid user' });

    const { name, profilePictureUrl, bio, age } = req.body;

    const updates: Partial<Record<string, any>> = {};
    if (typeof name === 'string') updates.name = name;
    if (typeof bio === 'string') updates.bio = bio;
    if (typeof age === 'number') updates.age = age;

    // Profile picture: upload file to Cloudinary if provided, else use URL from body
    if (req.file?.buffer) {
      const result = await uploadBufferToCloudinary(
        req.file.buffer,
        `user-${userId}-profile`,
        'profiles'
      );
      updates.profilePictureUrl = result.secure_url;
    } else if (typeof profilePictureUrl === 'string') {
      updates.profilePictureUrl = profilePictureUrl;
    }

    const updated = await UserService.updateUserById(String(userId), updates);

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const UserController = {
  getProfile,
  updateProfile
};