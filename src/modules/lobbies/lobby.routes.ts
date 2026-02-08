import { Router } from "express"
import { authMiddleware } from "../../middlewares/auth.middleware"
import { lobbyController } from "./lobby.controller"
import { memberController } from "../members/member.controller"

const router = Router()

router.post("/", authMiddleware, lobbyController.createLobby)
router.get("/", authMiddleware, lobbyController.getUserLobbies)
router.get("/:id/summary", authMiddleware, lobbyController.getLobbySummary)
router.get("/:id/members", authMiddleware, memberController.getLobbyMembers)
router.get("/:id", authMiddleware, lobbyController.getLobbyDetails)

export const lobbyRoutes = router
