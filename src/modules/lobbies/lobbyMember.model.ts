
// src/models/LobbyMember.model.ts
import { Schema, model, HydratedDocument, Types } from "mongoose";

export interface ILobbyMember {
  lobbyId: Types.ObjectId;
  userId: Types.ObjectId;
  individualBalance: Types.Decimal128;
  totalDeposited: Types.Decimal128;
  joinedAt: Date;
}

export type LobbyMemberDocument = HydratedDocument<ILobbyMember>;

const LobbyMemberSchema = new Schema<ILobbyMember>(
  {
    lobbyId: {
      type: Schema.Types.ObjectId,
      ref: "Lobby",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    individualBalance: {
      type: Schema.Types.Decimal128,
      default: () => new Types.Decimal128("0"),
    },
    totalDeposited: {
      type: Schema.Types.Decimal128,
      default: () => new Types.Decimal128("0"),
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// Composite unique index
LobbyMemberSchema.index({ lobbyId: 1, userId: 1 }, { unique: true });

export const LobbyMember = model<ILobbyMember>(
  "LobbyMember",
  LobbyMemberSchema
);
