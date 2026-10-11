import { z } from "zod";
import { PaymentMethod } from "../../../../generated/prisma";

export const invoiceIdParamSchema = z.object({
  id: z.string().min(1, "Invoice ID is required"),
});

export const createInvoicePaymentSchema = z.object({
  amount: z
    .number()
    .finite()
    .positive("Payment amount must be greater than 0"),

  paymentMethod: z.nativeEnum(PaymentMethod),

  paidAt: z.coerce.date().optional(),

  note: z.string().trim().max(1000).optional().nullable(),
});

export type CreateInvoicePaymentInput = z.infer<
  typeof createInvoicePaymentSchema
>;