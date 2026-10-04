import { z } from "zod";
import { PaymentMethod, PaymentStatus } from "../../../generated/prisma";


// export const getPaymentsSchema = z.object({
//   status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional(),
//   limit: z
//     .string()
//     .transform((val) => parseInt(val, 10))
//     .refine((val) => val > 0 && val <= 100, {
//       message: "Limit must be between 1 and 100",
//     })
//     .optional()
//     .default(10),
// });

// export const paymentIdParamSchema = z.object({
//   id: z.string(),
// });

// export const updatePaymentStatusSchema = z.object({
//   status: z.enum(["PAID", "PENDING", "OVERDUE", "CANCELLED"]),
//   paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CCP", "OTHER"]).optional(),
//   paidAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
//     message: "Invalid ISO date format",
//   }).optional(),
// });


// ==============================================
// new get payments with filters and stats
// ==============================================
// import { PaymentStatus, PaymentMethod } from "@prisma/client";



export const paymentStatusEnum = z.nativeEnum(PaymentStatus);
export const paymentMethodEnum = z.nativeEnum(PaymentMethod);

export const getPaymentsQuerySchema = z.object({
  status: paymentStatusEnum.optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
    .optional(),
  search: z.string().optional(),
  groupId: z.string().optional(),
});

export const createPaymentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  groupId: z.string().optional().nullable(),
  amount: z.number().positive("Amount must be greater than 0"),
  status: paymentStatusEnum.default(PaymentStatus.PENDING),
  dueDate: z.coerce.date().optional().nullable(),
  paidAt: z.coerce.date().optional().nullable(),
  periodStart: z.coerce.date().optional().nullable(),
  periodEnd: z.coerce.date().optional().nullable(),
  paymentMethod: paymentMethodEnum.optional().nullable(),
  note: z.string().optional().nullable(),
});

export const updatePaymentSchema = z.object({
  status: paymentStatusEnum.optional(),
  amount: z.number().positive().optional(),
  dueDate: z.coerce.date().optional().nullable(),
  paidAt: z.coerce.date().optional().nullable(),
  periodStart: z.coerce.date().optional().nullable(),
  periodEnd: z.coerce.date().optional().nullable(),
  paymentMethod: paymentMethodEnum.optional().nullable(),
  note: z.string().optional().nullable(),
});

export const paymentIdParamSchema = z.object({
  id: z.string(),
});

export type GetPaymentsQuery = z.infer<typeof getPaymentsQuerySchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;