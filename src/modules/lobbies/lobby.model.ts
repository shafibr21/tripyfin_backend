// src/models/Lobby.model.ts
import { Schema, model, HydratedDocument, Types } from "mongoose";

export interface ILobby {
  name: string;
  leaderId: Types.ObjectId;
  totalBalance: Types.Decimal128;
  initialDeposit: Types.Decimal128;
  status: "active" | "closed";
  inviteCode?: string;
  createdAt: Date;
}

export type LobbyDocument = HydratedDocument<ILobby>;

const LobbySchema = new Schema<ILobby>(
  {
    name: { type: String, required: true },
    leaderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    totalBalance: {
      type: Schema.Types.Decimal128,
      default: () => new Types.Decimal128("0"),
    },
    initialDeposit: {
      type: Schema.Types.Decimal128,
      default: () => new Types.Decimal128("0"),
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate for lobby members
LobbySchema.virtual("members", {
  ref: "LobbyMember",
  localField: "_id",
  foreignField: "lobbyId",
});

export const Lobby = model<ILobby>("Lobby", LobbySchema);
