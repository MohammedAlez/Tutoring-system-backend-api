import type { Response } from "express";
import type { AuthenticatedRequest } from "../../utils/extendedRequests";
import { asyncHandler } from "../../middleware/asyncHandler";
import { getSessionsByDate } from "./session.service";
import { getSessionsSchema } from "./validation";

export const getSessionsController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { date } = getSessionsSchema.parse(req.query);

    const sessions = await getSessionsByDate(tutorId, date);
    
    return res.status(200).json({ data: sessions });
  }
);
