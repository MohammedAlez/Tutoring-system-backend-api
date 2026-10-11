import type { Response } from "express";
import { getUpcomingPayments } from "./payment-upcoming.service";
import { AuthenticatedRequest } from "../../utils/extendedRequests";
import { asyncHandler } from "../../middleware/asyncHandler";


export const getUpcomingPaymentsController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;

    const result = await getUpcomingPayments(tutorId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }
);