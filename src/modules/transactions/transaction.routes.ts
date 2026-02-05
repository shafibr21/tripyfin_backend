import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { transactionController } from "./transaction.controller";

const router = express.Router();

router.post(
  "/lobbies/:id/deposits",
  authMiddleware,
  transactionController.addDeposit
);
router.post(
  "/lobbies/:id/expenses",
  authMiddleware,
  transactionController.addExpense
);
router.post(
  "/lobbies/:id/invite-code",
  authMiddleware,
  transactionController.generateInviteCode
);

router.get(
  "/lobbies/:id",
  authMiddleware,
  transactionController.getLobbyTransactions
);

router.get(
  "/lobbies/transaction-details/:id",
  authMiddleware,
  transactionController.getTransactionDetails
);

router.post(
  "/lobbies/join-with-deposit-and-code",
  authMiddleware,
  transactionController.joinLobbyByInviteCodeWithDeposit
);

export const transactionRoutes = router;
