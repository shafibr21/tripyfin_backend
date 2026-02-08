import { Types } from "mongoose";
import { LobbyMember } from "../lobbies/lobbyMember.model";
import { Lobby } from "../lobbies/lobby.model";
import { Transaction } from "../transactions/transaction.model";
import { TransactionDetail } from "../transactions/transactionDetail.model";

export interface MemberSummary {
  id: string;
  name: string;
  profilePictureUrl?: string;
  deposited: number;
  expenses: number;
  balance: number;
  owes: number;
}

const getLobbyMembers = async (
  lobbyId: string,
  userId: string
): Promise<MemberSummary[] | null | { forbidden: true }> => {
  const lobbyObjectId = new Types.ObjectId(lobbyId);
  const userObjectId = new Types.ObjectId(userId);

  const lobby = await Lobby.findById(lobbyObjectId).lean();
  if (!lobby) return null;

  const isMember = await LobbyMember.findOne({
    lobbyId: lobbyObjectId,
    userId: userObjectId,
  });
  if (!isMember) return { forbidden: true };

  const [members, transactions] = await Promise.all([
    LobbyMember.find({ lobbyId: lobbyObjectId })
      .populate("userId", "name profilePictureUrl")
      .sort({ joinedAt: 1 })
      .lean(),
    Transaction.find({ lobbyId: lobbyObjectId })
      .select("type totalAmount _id")
      .lean(),
  ]);

  const transactionIds = (transactions as any[]).map((t) => t._id);
  const details =
    transactionIds.length > 0
      ? await TransactionDetail.find({
          transactionId: { $in: transactionIds },
        })
          .select("transactionId userId amount")
          .lean()
      : [];

  const memberCount = members.length || 1;
  const transactionsWithDetails = (transactions as any[]).map((t: any) => {
    const txDetails = details.filter(
      (d: any) => String(d.transactionId) === String(t._id)
    );
    return {
      type: t.type,
      totalAmount: Number(t.totalAmount),
      details: txDetails.map((d: any) => ({
        userId: d.userId,
        amount: Number(d.amount),
      })),
    };
  });

  return members.map((member: any) => {
    const totalDeposited = Number(member.totalDeposited);
    const totalExpenses = transactionsWithDetails
      .filter((t: any) => t.type !== "deposit")
      .reduce((sum: number, transaction: any) => {
        if (transaction.type === "expense_equal") {
          return sum + transaction.totalAmount / memberCount;
        }
        if (transaction.type === "expense_individual") {
          const detail = transaction.details?.find(
            (d: any) => String(d.userId) === String((member.userId as any)?._id ?? member.userId)
          );
          return sum + (detail ? detail.amount : 0);
        }
        return sum;
      }, 0);

    const balance = totalDeposited - totalExpenses;
    const owes = balance < 0 ? Math.round(Math.abs(balance) * 100) / 100 : 0;

    const user = member.userId as { _id: Types.ObjectId; name?: string; profilePictureUrl?: string } | undefined;
    return {
      id: String(user?._id ?? member.userId),
      name: user?.name ?? "Unknown",
      profilePictureUrl: user?.profilePictureUrl,
      deposited: Math.round(totalDeposited * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      owes,
    };
  });
};

export const memberService = {
  getLobbyMembers,
};
