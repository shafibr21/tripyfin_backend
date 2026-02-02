import { Request, Response } from "express"
import { lobbyService } from "./lobby.service"

const createLobby = async (req: Request, res: Response) => {
  try {
    const user = req.user

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const { name, initialDeposit } = req.body

    const result = await lobbyService.createLobby({
      name,
      initialDeposit,
      userId: user.id,
    })

    return res.status(201).json({
      message: "Lobby created successfully",
      lobbyId: result.lobbyId,
    })
  } catch (error) {
    console.error("Create lobby error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
};

const getUserLobbies = async (req: Request, res: Response) => {
  try {
    const user = req.user

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const lobbies = await lobbyService.getUserLobbies(user.id)

    return res.status(200).json({
      success: true,
      data: lobbies,
    })
  } catch (error) {
    console.error("Fetch lobbies error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
};

const getLobbyDetails = async (
  req: Request,
  res: Response
) => {
  try {
    const user = req.user
    const idRaw = req.params.id
    const id = Array.isArray(idRaw) ? idRaw[0] : idRaw

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const result = await lobbyService.getLobbyDetails(id, user.id)

    if (!result) {
      return res.status(404).json({ message: "Lobby not found" })
    }

    if ((result as any).forbidden) {
      return res.status(403).json({ message: "Access denied" })
    }

    return res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Get lobby details error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
};

export const lobbyController = {
    createLobby,
    getUserLobbies,
    getLobbyDetails,
}
