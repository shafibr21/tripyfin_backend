import { Request, Response } from "express";
import { transactionService } from "./transaction.service";

const addDeposit = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string);

    if (!id) {
      return res.status(400).json({ message: "Missing lobby id parameter" });
    }

    const { amount, description, userId } = req.body;

    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const transactionId = await transactionService.addDeposit({
      lobbyId: id,
      currentUserId,
      amount,
      description,
      targetUserId: userId,
    });

    res.status(201).json({
      message: "Deposit added successfully",
      transactionId,
    });
  } catch (err: any) {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Internal server error" });
  }
};

const addExpense = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string);

    if (!id) {
      return res.status(400).json({ message: "Missing lobby id parameter" });
    }
    const { description, type, totalAmount, individualAmounts } = req.body;

    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const transactionId = await transactionService.addExpense({
      lobbyId: id,
      userId: currentUserId,
      description,
      type,
      totalAmount,
      individualAmounts,
    });

    return res.status(201).json({
      message: "Expense added successfully",
      transactionId,
    });
  } catch (err: any) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Internal server error" });
  }
};

const generateInviteCode = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string);

    if (!id) {
      return res.status(400).json({ message: "Missing lobby id parameter" });
    }

    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const inviteCode = await transactionService.generateInviteCode(
      id,
      currentUserId
    );

    return res.status(200).json({ inviteCode });
  } catch (err: any) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Internal server error" });
  }
};

const getLobbyTransactions = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string);

    if (!id) {
      return res.status(400).json({ message: "Missing lobby id parameter" });
    }

    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = await transactionService.getLobbyTransactions(id, currentUserId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err: any) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Internal server error" });
  }
};

const getTransactionDetails = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string);

    if (!id) {
      return res.status(400).json({ message: "Missing transaction id parameter" });
    }

    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = await transactionService.getTransactionDetails(id, currentUserId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err: any) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Internal server error" });
  }
};

const joinLobbyByInviteCodeWithDeposit = async (
  req: Request,
  res: Response
) => {
  try {
    const { inviteCode, amount } = req.body;

    if (!inviteCode || typeof inviteCode !== "string") {
      return res.status(400).json({ message: "inviteCode is required" });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res
        .status(400)
        .json({ message: "amount must be a positive number" });
    }

    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { lobbyId } = await transactionService.joinLobbyByCodeDeposit({
      inviteCode,
      userId: currentUserId,
      amount,
    });

    return res.status(200).json({
      message: "Successfully joined the lobby with initial deposit",
      lobbyId,
    });
  } catch (err: any) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Internal server error" });
  }
};

export const transactionController = {
  addDeposit,
  addExpense,
  generateInviteCode,
  getLobbyTransactions,
  getTransactionDetails,
  joinLobbyByInviteCodeWithDeposit,
};
