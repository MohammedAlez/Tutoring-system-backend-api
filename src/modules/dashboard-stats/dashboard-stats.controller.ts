import type { Response } from "express";
import type { AuthenticatedRequest } from "../../utils/extendedRequests";
import { asyncHandler } from "../../middleware/asyncHandler";
import { getDashboardStats } from "./dashboard-stats.service";

export const getDashboardStatsController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const stats = await getDashboardStats(tutorId);
    
    return res.status(200).json(stats);
  }
);
