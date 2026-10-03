import type { Response } from "express";
import type { AuthenticatedRequest } from "../../utils/extendedRequests";
import { asyncHandler } from "../../middleware/asyncHandler";
import { getTutorSchedules } from "./schedule.service";

export const getTutorSchedulesController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;

    const schedules = await getTutorSchedules(tutorId);

    return res.status(200).json({ success: true, data: schedules });
  }
);