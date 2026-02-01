import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import AppError from '../../errorHelper/AppError.';
import CatchAsync from '../../utils/CatchAsync';
import { User } from '../users/user.modal';


const register = async (req: Request, res: Response) => {
  const { name, email, password, confirmPassword } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }
  const user = await AuthService.registerUser(name, email, password);
  res.json({ success: true, data: user });
};

const login = async (req: Request, res: Response) => {
  const { email, password} = req.body;
  const result = await AuthService.loginUser(email, password);
  res.json({ success: true, data: result });
};

const googleOAuth = async (req: Request, res: Response) => {
  const { idToken } = req.body;
  const result = await AuthService.verifyGoogleToken(idToken);
  res.json({ success: true, data: result });
};

const appleOAuth = async (req: Request, res: Response) => {
  const { idToken } = req.body;
  const result = await AuthService.verifyAppleToken(idToken);
  res.json({ success: true, data: result });
};

const logout = async (req: Request, res: Response) => {
  try {
    // Prefer Authorization header (Bearer token). If not present, fall back to body.token
    const authHeader = req.headers.authorization;
    let token: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    token = token || req.body?.token || req.body?.refreshToken;

    if (!token) {
      return res.status(400).json({ success: false, message: 'No token provided for logout' });
    }

    // Revoke the provided token (in-memory). Client should also remove token locally.
    await AuthService.logoutUser(token);
    // If client provided an FCM token to remove on logout, remove it from any user that has it.
    const fcmToken = req.body?.fcmToken || req.body?.fcm_token;
    if (fcmToken) {
      try {
        await User.updateOne({ fcmTokens: fcmToken }, { $pull: { fcmTokens: fcmToken } });
      } catch (err) {
        console.error('Failed to remove fcm token during logout', err);
      }
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    throw new AppError(500, error.message || 'Server error');
  }
};

  const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) throw new AppError(400, 'Email is required');
    await AuthService.forgotPassword(email);
    res.json({ success: true, message: 'OTP sent to email if account exists' });
  };

  const verifyResetOtp = async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    if (!email || !otp) throw new AppError(400, 'Email and OTP are required');
    await AuthService.verifyResetOtp(email, otp);
    res.json({ success: true, message: 'OTP verified' });
  };

  const resetPassword = async (req: Request, res: Response) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) throw new AppError(400, 'Email and newPassword are required');
    await AuthService.resetPassword(email, newPassword);
    res.json({ success: true, message: 'Password reset successful' });
  };

export const AuthController = {
  register: CatchAsync(register),
  login: CatchAsync(login),
  googleOAuth: CatchAsync(googleOAuth),
  appleOAuth: CatchAsync(appleOAuth),
    logout: CatchAsync(logout),
    forgotPassword: CatchAsync(forgotPassword),
    verifyResetOtp: CatchAsync(verifyResetOtp),
    resetPassword: CatchAsync(resetPassword)
};