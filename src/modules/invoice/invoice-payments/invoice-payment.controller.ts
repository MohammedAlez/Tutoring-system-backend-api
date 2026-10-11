import type { Response } from "express";


import { createInvoicePayment, getInvoicePayments } from "./invoice-payment.service";
import {
  createInvoicePaymentSchema,
  invoiceIdParamSchema,
} from "./validation";
import { AuthenticatedRequest } from "../../../utils/extendedRequests";
import { asyncHandler } from "../../../middleware/asyncHandler";

export const createInvoicePaymentController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;

    const { id: invoiceId } = invoiceIdParamSchema.parse(req.params);
    const body = createInvoicePaymentSchema.parse(req.body);

    const result = await createInvoicePayment(
      tutorId,
      invoiceId,
      body
    );

    return res.status(201).json({
      success: true,
      data: result,
    });
  }
);


export const getInvoicePaymentsController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;

    const { id: invoiceId } = invoiceIdParamSchema.parse(req.params);

    const result = await getInvoicePayments(tutorId, invoiceId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }
);