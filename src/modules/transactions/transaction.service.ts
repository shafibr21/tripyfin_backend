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

const joinLobby = async (lobbyId: string, userId: string) => {
  const lobby = await Lobby.findById(lobbyId);
  if (!lobby) {
    throw { status: 404, message: "Lobby not found" };
  }

  const exists = await LobbyMember.findOne({
    lobbyId,
    userId,
  });

  if (exists) {
    throw {
      status: 400,
      message: "You are already a member of this lobby",
    };
  }

  await LobbyMember.create({
    lobbyId,
    userId,
    totalDeposited: 0,
    individualBalance: 0,
  });
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

export const transactionService = {
  addDeposit,
  addExpense,
  generateInviteCode,
  joinLobby,
  joinLobbyByCodeDeposit,
};
