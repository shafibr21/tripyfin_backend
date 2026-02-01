import AppError from "../../errorHelper/AppError.";
import { User } from "./user.modal";


const getUserById = async (id: string) => {
  if (!id) throw new AppError(400, 'User id required');
  const user = await User.findById(id).select('-password');
  return user;
};

const updateUserById = async (id: string, updates: Record<string, any>) => {
  if (!id) throw new AppError(400, 'User id required');
  const allowed = ['name', 'profilePictureUrl', 'bio', 'age'];
  const payload: Record<string, any> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      payload[key] = updates[key];
    }
  }

  const updated = await User.findByIdAndUpdate(id, payload, { new: true }).select('-password');
  return updated;
};

export const UserService = {
  getUserById,
  updateUserById
};