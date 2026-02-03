import { Request, Response } from "express"
import { transactionService } from "./transaction.service";


const addDeposit = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string)

    if (!id) {
      return res.status(400).json({ message: "Missing lobby id parameter" })
    }

    const { amount, description, userId } = req.body

    const currentUserId = req.user?.id
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const transactionId = await transactionService.addDeposit({
      lobbyId: id,
      currentUserId,
      amount,
      description,
      targetUserId: userId,
    })

    res.status(201).json({
      message: "Deposit added successfully",
      transactionId,
    })
  } catch (err: any) {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Internal server error" })
  }
};

const addExpense = async (
  req: Request,
  res: Response
) => {
  try {
    const rawId = req.params.id
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string)

    if (!id) {
      return res.status(400).json({ message: "Missing lobby id parameter" })
    }
    const { description, type, totalAmount, individualAmounts } = req.body

    const currentUserId = req.user?.id

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" })
    }


    const transactionId = await transactionService.addExpense({
      lobbyId: id,
      userId: currentUserId,
      description,
      type,
      totalAmount,
      individualAmounts,
    })

    return res.status(201).json({
      message: "Expense added successfully",
      transactionId,
    })
  } catch (err: any) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Internal server error" })
  }
};


const generateInviteCode = async (
  req: Request,
  res: Response
) => {
  try {
    const rawId = req.params.id
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string)

    if (!id) {
      return res.status(400).json({ message: "Missing lobby id parameter" })
    }

    const currentUserId = req.user?.id
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const inviteCode = await transactionService.generateInviteCode(id, currentUserId)

    return res.status(200).json({ inviteCode })
  } catch (err: any) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Internal server error" })
  }
};

const sendInvite = async (
  req: Request,
  res: Response
) => {
  try {
    const rawId = req.params.id
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string)

    if (!id) {
      return res.status(400).json({ message: "Missing lobby id parameter" })
    }

    const { email } = req.body

    const currentUserId = req.user?.id
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const inviteCode = await transactionService.sendInvite(
      id,
      currentUserId,
      email
    )

    return res.status(200).json({
      message: "Invitation sent successfully",
      inviteCode, // ⚠️ remove in prod, email instead
    })
  } catch (err: any) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Internal server error" })
  }
};

const joinLobby = async (
  req: Request,
  res: Response
) => {
  try {
    const rawId = req.params.id
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string)

    if (!id) {
      return res.status(400).json({ message: "Missing lobby id parameter" })
    }

    const currentUserId = req.user?.id
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    await transactionService.joinLobby(id, currentUserId)

    return res.status(200).json({
      message: "Successfully joined the lobby",
    })
  } catch (err: any) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Internal server error" })
  }
};

export const transactionController = {
  addDeposit,
  addExpense,
  generateInviteCode,
  sendInvite,
  joinLobby,
};