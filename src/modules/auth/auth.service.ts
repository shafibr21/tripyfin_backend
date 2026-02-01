import bcrypt from 'bcrypt';
import jwt, { Secret } from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import crypto from 'crypto';
import AppError from '../../errorHelper/AppError.';
import { sendEmail } from '../../utils/sendEmail';
import { User } from '../users/user.modal';


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// In-memory revoked access tokens store (simple blacklist until server restart)
const revokedTokens = new Set<string>();

const registerUser = async (name: string, email: string, password: string) => {
  const exists = await User.findOne({ email });
  if (exists) throw new AppError(400, 'Email already exists');

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    passwordHash: hashedPassword,
  });

  const { passwordHash: _, ...safeUser } = user.toObject();
  return safeUser;
};

const loginUser = async (email: string, password: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(401, 'Invalid credentials');

  if (!user.passwordHash) throw new AppError(401, 'Invalid credentials');
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new AppError(401, 'Invalid credentials');

  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!jwtAccessSecret) {
    throw new AppError(500, 'JWT_ACCESS_SECRET (or JWT_SECRET) environment variable is not set');
  }

  const accessToken = (jwt as any).sign(
    { userId: user._id },
    jwtAccessSecret,
    { expiresIn: '7d' }
  );

  const { passwordHash: _, ...safeUser } = user.toObject();

  return { user: safeUser, accessToken };
};

const verifyGoogleToken = async (idToken: string) => {
  if (!idToken) throw new AppError(400, 'idToken is required');
  const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) throw new AppError(400, 'Invalid Google token');

  const email = payload.email;

  let user = await User.findOne({ email });
  if (!user) {
    const randomPwd = crypto.randomBytes(16).toString('hex');
    const hashed = await bcrypt.hash(randomPwd, 10);
    user = await User.create({ name: payload.name || 'No Name', email, passwordHash: hashed });
  }

  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!jwtAccessSecret) throw new AppError(500, 'JWT secret not set');

  const accessToken = (jwt as any).sign({ userId: user._id }, jwtAccessSecret, { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '30m' });

  return { user, accessToken };
};

const verifyAppleToken = async (idToken: string) => {
  if (!idToken) throw new AppError(400, 'idToken is required');
  const applePayload = await appleSignin.verifyIdToken(idToken, {
    audience: process.env.APPLE_CLIENT_ID || process.env.APPLE_SERVICE_ID
  });

  const email = (applePayload as any).email;

  let user = await User.findOne({ email });
  if (!user) {
    const randomPwd = crypto.randomBytes(16).toString('hex');
    const hashed = await bcrypt.hash(randomPwd, 10);
    user = await User.create({ name: (applePayload as any).name || 'No Name', email, passwordHash: hashed });
  }

  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!jwtAccessSecret) throw new AppError(500, 'JWT secret not set');

  const accessToken = (jwt as any).sign({ userId: user._id }, jwtAccessSecret, { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '30m' });

  return { user, accessToken };
};

const logoutUser = async (refreshToken: string) => {
  // For this low-budget project we don't use refresh tokens.
  // Keep the function for compatibility. If a token string is provided, revoke it temporarily.
  if (refreshToken) {
    revokedTokens.add(refreshToken);
  }
  return;
}

const revokeToken = (token: string) => {
  if (!token) return;
  revokedTokens.add(token);
};

const isTokenRevoked = (token: string) => {
  return revokedTokens.has(token);
};

async function forgotPassword(email: string) {
  const user = await User.findOne({ email });
  // Always respond success to avoid revealing account existence; only perform actions if user exists
  if (!user) return;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashed = crypto.createHash('sha256').update(otp).digest('hex');
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  user.resetPasswordOtp = hashed;
  user.resetPasswordOtpExpires = expires;
  user.resetPasswordVerified = false;
  await user.save();

  // send OTP via email (plain OTP in email body)
  try {
    await sendEmail({
      to: user.email,
      subject: 'Password reset OTP',
      text: `Your password reset code is: ${otp}. It expires in 10 minutes.`,
      html: `<p>Your password reset code is: <strong>${otp}</strong>. It expires in 10 minutes.</p>`
    });
  } catch (err) {
    // Log and swallow to avoid leaking email problems to client
    console.error('Failed to send reset OTP email', err);
  }
}

async function verifyResetOtp(email: string, otp: string) {
  const user = await User.findOne({ email });
  if (!user || !user.resetPasswordOtp || !user.resetPasswordOtpExpires) throw new AppError(400, 'Invalid OTP or email');

  if (user.resetPasswordOtpExpires.getTime() < Date.now()) throw new AppError(400, 'OTP expired');

  const hashed = crypto.createHash('sha256').update(otp).digest('hex');
  if (hashed !== user.resetPasswordOtp) throw new AppError(400, 'Invalid OTP');

  user.resetPasswordVerified = true;
  await user.save();
}

async function resetPassword(email: string, newPassword: string) {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(400, 'Invalid request');

  if (!user.resetPasswordVerified) throw new AppError(400, 'OTP not verified');
  if (user.resetPasswordOtpExpires && user.resetPasswordOtpExpires.getTime() < Date.now()) throw new AppError(400, 'OTP expired');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.passwordHash = hashedPassword as any;
  user.resetPasswordOtp = undefined as any;
  user.resetPasswordOtpExpires = undefined as any;
  user.resetPasswordVerified = false;
  await user.save();
}

export const AuthService = {
  registerUser,
  loginUser,
  verifyGoogleToken,
  verifyAppleToken,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  logoutUser,
  revokeToken,
  isTokenRevoked
};
