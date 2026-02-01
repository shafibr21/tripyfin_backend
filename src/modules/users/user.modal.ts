// src/models/User.model.ts
import { Schema, model, HydratedDocument } from "mongoose";

export interface IUser {
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  profilePictureUrl?: string;
    resetPasswordOtp?: string;
    resetPasswordOtpExpires?: Date;
    resetPasswordVerified?: boolean;
    bio ?: string;
    age ?: number;

}

export type UserDocument = HydratedDocument<IUser>;

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    profilePictureUrl: {
      type: String,
    },
    resetPasswordOtp: {
      type: String,
    },
    resetPasswordOtpExpires: {
      type: Date,
    },
    resetPasswordVerified: {
      type: Boolean,
      default: false,
    },
    bio: {
      type: String,
    },
    age: {
      type: Number,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  }
);

export const User = model<IUser>("User", UserSchema);
