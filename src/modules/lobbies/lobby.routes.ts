import { Router } from "express"
import { authMiddleware } from "../../middlewares/auth.middleware"
import { lobbyController } from "./lobby.controller"

const router = Router()

router.post("/", authMiddleware, lobbyController.createLobby)
router.get("/", authMiddleware, lobbyController.getUserLobbies)
router.get("/:id/summary", authMiddleware, lobbyController.getLobbySummary)
router.get("/:id", authMiddleware, lobbyController.getLobbyDetails)

export const lobbyRoutes = router
