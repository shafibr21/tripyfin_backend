import { Types } from "mongoose";
import { LobbyMember } from "../lobbies/lobbyMember.model";
import { Transaction } from "./transaction.model";
import { Lobby } from "../lobbies/lobby.model";
import { TransactionDetail } from "./transactionDetail.model";
import { User } from "../users/user.modal";

const addDeposit = async ({
  lobbyId,
  currentUserId,
  amount,
  description,
  targetUserId,
}: {
  lobbyId: string;
  currentUserId: string;
  amount: number;
  description?: string;
  targetUserId?: string;
}) => {
  const lobbyObjectId = new Types.ObjectId(lobbyId);
  const currentUserObjectId = new Types.ObjectId(currentUserId);
  const targetUserObjectId = new Types.ObjectId(targetUserId || currentUserId);

  // Check membership
  const member = await LobbyMember.findOne({
    lobbyId: lobbyObjectId,
    userId: currentUserObjectId,
  });

  if (!member) {
    throw { status: 403, message: "You are not a member of this lobby" };
  }

  // Create transaction
  const transaction = await Transaction.create({
    lobbyId: lobbyObjectId,
    createdBy: currentUserObjectId,
    type: "deposit",
    description: description || "Deposit",
    totalAmount: amount,
  });

  // Update member balances
  await LobbyMember.updateOne(
    { lobbyId: lobbyObjectId, userId: targetUserObjectId },
    {
      $inc: {
        totalDeposited: amount,
        individualBalance: amount,
      },
    }
  );

  // Update lobby balance
  await Lobby.updateOne(
    { _id: lobbyObjectId },
    { $inc: { totalBalance: amount } }
  );

  return transaction._id;
};

const addExpense = async ({
  lobbyId,
  userId,
  description,
  type,
  totalAmount,
  individualAmounts,
}: any) => {
  const lobbyObjectId = new Types.ObjectId(lobbyId);
  const userObjectId = new Types.ObjectId(userId);

  const lobby = await Lobby.findById(lobbyObjectId).populate("members");

  if (!lobby || String(lobby.leaderId) !== String(userObjectId)) {
    throw {
      status: 403,
      message: "Only lobby leader can add expenses",
    };
  }

  // get populated members safely (populate types are not reflected in ILobby)
  const members: any[] = (lobby as any).members || [];

  let finalTotalAmount = 0;
  let details: any[] = [];

  if (type === "expense_equal") {
    finalTotalAmount = totalAmount;
    details = members.map((m: any) => ({
      userId: m.userId,
      amount: totalAmount / members.length,
    }));
  }

  if (type === "expense_individual") {
    finalTotalAmount = individualAmounts.reduce(
      (sum: number, i: any) => sum + i.amount,
      0
    );
    details = individualAmounts.filter((i: any) => i.amount > 0);
  }

  const transaction = await Transaction.create({
    lobbyId: lobbyObjectId,
    createdBy: userObjectId,
    type,
    description,
    totalAmount: finalTotalAmount,
  });

  await TransactionDetail.insertMany(
    details.map((d) => ({
      transactionId: transaction._id,
      userId: d.userId,
      amount: d.amount,
    }))
  );

  await Lobby.updateOne(
    { _id: lobbyObjectId },
    { $inc: { totalBalance: -finalTotalAmount } }
  );

  return transaction._id;
};

const generateInviteCode = async (lobbyId: string, userId: string) => {
  const lobby = await Lobby.findById(lobbyId);

  if (!lobby || String(lobby.leaderId) !== userId) {
    throw {
      status: 403,
      message: "Only lobby leader can generate invite codes",
    };
  }
  if (lobby.inviteCode) {
    return lobby.inviteCode;
  } else {
    const inviteCode =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    lobby.inviteCode = inviteCode;
    await lobby.save();

    return inviteCode;
  }
};

const joinLobbyByCodeDeposit = async ({
  inviteCode,
  userId,
  amount,
}: {
  inviteCode: string;
  userId: string;
  amount: number;
}) => {
  // Find lobby by invite code
  const lobby = await Lobby.findOne({ inviteCode });
  if (!lobby) {
    throw { status: 404, message: "No lobby found for this invite code" };
  }

  const lobbyId = lobby._id.toString();

  // Check if user is already a member
  const existingMember = await LobbyMember.findOne({
    lobbyId,
    userId,
  });

  if (existingMember) {
    throw {
      status: 400,
      message: "You are already a member of this lobby",
    };
  }

  // Create member entry first so addDeposit can succeed
  await LobbyMember.create({
    lobbyId,
    userId,
    totalDeposited: 0,
    individualBalance: 0,
  });

  // Treat the provided amount as the initial deposit for this user
  await addDeposit({
    lobbyId,
    currentUserId: userId,
    amount,
    description: "Initial deposit on join",
    targetUserId: userId,
  });

  return { lobbyId };
};

const getLobbyTransactions = async (lobbyId: string, userId: string) => {
  const lobbyObjectId = new Types.ObjectId(lobbyId);
  const userObjectId = new Types.ObjectId(userId);

  // Ensure user is a member of the lobby
  const member = await LobbyMember.findOne({
    lobbyId: lobbyObjectId,
    userId: userObjectId,
  });

  if (!member) {
    throw { status: 403, message: "Access denied to this lobby" };
  }

  const transactions = await Transaction.find({ lobbyId: lobbyObjectId })
    .sort({ createdAt: -1 })
    .populate("createdBy", "name profilePictureUrl")
    .lean();

  return transactions.map((t: any) => ({
    id: t._id,
    description: t.description,
    type: t.type,
    totalAmount: Number(t.totalAmount),
    createdAt: t.createdAt,
    createdBy: t.createdBy
      ? {
          id: t.createdBy._id,
          name: t.createdBy.name,
          profilePictureUrl: t.createdBy.profilePictureUrl,
        }
      : null,
  }));
};

const getTransactionDetails = async (
  transactionId: string,
  userId: string
) => {
  const transactionObjectId = new Types.ObjectId(transactionId);
  const userObjectId = new Types.ObjectId(userId);

  const transaction = await Transaction.findById(transactionObjectId)
    .populate("createdBy", "name profilePictureUrl")
    .lean();

  if (!transaction) {
    throw { status: 404, message: "Transaction not found" };
  }

  // Ensure the user belongs to this lobby
  const lobbyId = transaction.lobbyId;
  const member = await LobbyMember.findOne({
    lobbyId,
    userId: userObjectId,
  });

  if (!member) {
    throw { status: 403, message: "Access denied to this transaction" };
  }

  const details = await TransactionDetail.find({
    transactionId: transactionObjectId,
  })
    .populate("userId", "name profilePictureUrl")
    .lean();

  return {
    id: transaction._id,
    lobbyId: transaction.lobbyId,
    description: transaction.description,
    type: transaction.type,
    totalAmount: Number(transaction.totalAmount),
    createdAt: transaction.createdAt,
    createdBy: transaction.createdBy
      ? {
          id: (transaction.createdBy as any)._id,
          name: (transaction.createdBy as any).name,
          profilePictureUrl: (transaction.createdBy as any).profilePictureUrl,
        }
      : null,
    breakdown: details.map((d: any) => ({
      id: d._id,
      amount: Number(d.amount),
      user: d.userId
        ? {
            id: d.userId._id,
            name: d.userId.name,
            profilePictureUrl: d.userId.profilePictureUrl,
          }
        : null,
    })),
  };
};

export const transactionService = {
  addDeposit,
  addExpense,
  generateInviteCode,
  joinLobbyByCodeDeposit,
  getLobbyTransactions,
  getTransactionDetails,
};
