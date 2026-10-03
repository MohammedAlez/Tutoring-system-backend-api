import type { Response } from "express";
import type { AuthenticatedRequest } from "../../utils/extendedRequests";
import { asyncHandler } from "../../middleware/asyncHandler";
import { getPaymentsList } from "./payment.service";
import { getPaymentsSchema } from "./validation";


export const getPaymentsController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { status, limit } = getPaymentsSchema.parse(req.query);

    const result = await getPaymentsList(tutorId, status, limit);
    
    return res.status(200).json(result);
  }
);