// import type { Response } from "express";
// import type { AuthenticatedRequest } from "../../utils/extendedRequests";
// import { asyncHandler } from "../../middleware/asyncHandler";
// import { getPaymentsList, updatePaymentStatus } from "./payment.service";
// import { getPaymentsSchema, paymentIdParamSchema, updatePaymentStatusSchema } from "./validation";


// export const getPaymentsController = asyncHandler(
//   async (req: AuthenticatedRequest, res: Response) => {
//     const tutorId = req.user!.userId;
//     const { status, limit } = getPaymentsSchema.parse(req.query);

//     const result = await getPaymentsList(tutorId, status, limit);
    
//     return res.status(200).json(result);
//   }
// );
// // 
// export const updatePaymentController = asyncHandler(
//   async (req: AuthenticatedRequest, res: Response) => {
//     const tutorId = req.user!.userId;
//     const { id } = paymentIdParamSchema.parse(req.params);
//     const data = updatePaymentStatusSchema.parse(req.body);

//     const payment = await updatePaymentStatus(tutorId, id, data);
    
//     if (!payment) {
//       return res.status(404).json({ message: "Payment not found" });
//     }

//     return res.status(200).json(payment);
//   }
// );


import type { Response } from "express";
import type { AuthenticatedRequest } from "../../utils/extendedRequests";
import { asyncHandler } from "../../middleware/asyncHandler";
import { createPayment, getPayments, updatePayment } from "./payment.service";
import {
  createPaymentSchema,
  getPaymentsQuerySchema,
  paymentIdParamSchema,
  updatePaymentSchema,
} from "./validations";

export const getPaymentsController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const filters = getPaymentsQuerySchema.parse(req.query);

    const result = await getPayments(tutorId, filters);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }
);

export const createPaymentController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const body = createPaymentSchema.parse(req.body);

    const newPayment = await createPayment(tutorId, body);

    return res.status(201).json({
      success: true,
      data: newPayment,
    });
  }
);

export const updatePaymentController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { id } = paymentIdParamSchema.parse(req.params);
    const body = updatePaymentSchema.parse(req.body);

    try {
      const updatedPayment = await updatePayment(tutorId, id, body);
      return res.status(200).json({
        success: true,
        data: updatedPayment,
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }
);