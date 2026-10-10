
import type { Response } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import type { AuthenticatedRequest } from "../../utils/extendedRequests";
import { getInvoicesQuerySchema, invoiceIdParamSchema, updateInvoiceSchema } from "./validation";
import { getInvoiceById, getInvoices, updateInvoice } from "./invoice.service";


export const getInvoicesController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const filters = getInvoicesQuerySchema.parse(req.query);

    const result = await getInvoices(tutorId, filters);

    return res.status(200).json({
      success: true,
      data: result.invoices,
      pagination: result.pagination,
    });
  },
);


export const getInvoiceByIdController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { id } = invoiceIdParamSchema.parse(req.params);

    const invoice = await getInvoiceById(tutorId, id);

    return res.status(200).json({
      success: true,
      data: { invoice },
    });
  },
);

export const updateInvoiceController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { id } = invoiceIdParamSchema.parse(req.params);
    const input = updateInvoiceSchema.parse(req.body);

    const invoice = await updateInvoice(tutorId, id, input);

    return res.status(200).json({
      success: true,
      data: { invoice },
    });
  },
);