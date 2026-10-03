import type { Response } from "express";
import type { AuthenticatedRequest } from "../../utils/extendedRequests";
import { asyncHandler } from "../../middleware/asyncHandler";
import { getPaymentsList, updatePaymentStatus } from "./payment.service";
import { getPaymentsSchema, paymentIdParamSchema, updatePaymentStatusSchema } from "./validation";


export const getPaymentsController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { status, limit } = getPaymentsSchema.parse(req.query);

    const result = await getPaymentsList(tutorId, status, limit);
    
    return res.status(200).json(result);
  }
);

export const updatePaymentController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { id } = paymentIdParamSchema.parse(req.params);
    const data = updatePaymentStatusSchema.parse(req.body);

    const payment = await updatePaymentStatus(tutorId, id, data);
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    return res.status(200).json(payment);
  }
);