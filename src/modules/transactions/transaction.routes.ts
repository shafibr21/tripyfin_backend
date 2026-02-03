import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { transactionController } from "./transaction.controller";

const router = express.Router();

router.post("/lobbies/:id/deposits", authMiddleware, transactionController.addDeposit)
router.post("/lobbies/:id/expenses", authMiddleware, transactionController.addExpense)
router.post("/lobbies/:id/invite-code", authMiddleware, transactionController.generateInviteCode)
router.post("/lobbies/:id/invite", authMiddleware, transactionController.sendInvite)
router.post("/lobbies/:id/join", authMiddleware, transactionController.joinLobby)


export const transactionRoutes = router;