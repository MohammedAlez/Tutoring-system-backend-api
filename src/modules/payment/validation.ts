import { z } from "zod";


export const getPaymentsSchema = z.object({
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 100, {
      message: "Limit must be between 1 and 100",
    })
    .optional()
    .default(10),
});

export const paymentIdParamSchema = z.object({
  id: z.string(),
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(["PAID", "PENDING", "OVERDUE", "CANCELLED"]),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CCP", "OTHER"]).optional(),
  paidAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid ISO date format",
  }).optional(),
});