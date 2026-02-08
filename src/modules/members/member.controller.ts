import { Request, Response } from "express";
import { memberService } from "./member.service";

const getLobbyMembers = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const idRaw = req.params.id;
    const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await memberService.getLobbyMembers(id, user.id);

    if (!result) {
      return res.status(404).json({ message: "Lobby not found" });
    }

    if ((result as { forbidden?: boolean }).forbidden) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get lobby members error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const memberController = {
  getLobbyMembers,
};
