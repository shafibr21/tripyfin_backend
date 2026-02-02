
// src/models/Transaction.model.ts
import { Schema, model, HydratedDocument, Types } from "mongoose";

export type TransactionType =
  | "deposit"
  | "expense_equal"
  | "expense_individual";

export interface ITransaction {
  lobbyId: Types.ObjectId;
  createdBy: Types.ObjectId;
  type: TransactionType;
  description: string;
  totalAmount: Types.Decimal128;
  createdAt: Date;
}

export type TransactionDocument = HydratedDocument<ITransaction>;

const TransactionSchema = new Schema<ITransaction>(
  {
    lobbyId: {
      type: Schema.Types.ObjectId,
      ref: "Lobby",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["deposit", "expense_equal", "expense_individual"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    totalAmount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const Transaction = model<ITransaction>(
  "Transaction",
  TransactionSchema
);
