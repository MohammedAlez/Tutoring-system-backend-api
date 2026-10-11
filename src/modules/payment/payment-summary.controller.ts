import type { Response } from "express";
import { AuthenticatedRequest } from "../../utils/extendedRequests";
import { asyncHandler } from "../../middleware/asyncHandler";
import { getPaymentsSummary } from "./payment-summary.service";

export const getPaymentsSummaryController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;

    const result = await getPaymentsSummary(tutorId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }
);