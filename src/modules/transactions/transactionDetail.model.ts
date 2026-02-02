// src/models/TransactionDetail.model.ts
import { Schema, model, HydratedDocument, Types } from "mongoose";

export interface ITransactionDetail {
  transactionId: Types.ObjectId;
  userId: Types.ObjectId;
  amount: Types.Decimal128;
}

export type TransactionDetailDocument =
  HydratedDocument<ITransactionDetail>;

const TransactionDetailSchema = new Schema<ITransactionDetail>(
  {
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
  },
  { timestamps: false }
);

export const TransactionDetail = model<ITransactionDetail>(
  "TransactionDetail",
  TransactionDetailSchema
);
