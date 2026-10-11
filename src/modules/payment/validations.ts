import { z } from "zod";
import { PaymentMethod, PaymentStatus } from "../../../generated/prisma";





export const paymentStatusEnum = z.nativeEnum(PaymentStatus);
export const paymentMethodEnum = z.nativeEnum(PaymentMethod);

export const getPaymentsQuerySchema = z
  .object({
    studentId: z.string().trim().min(1).optional(),
    invoiceId: z.string().trim().min(1).optional(),
    groupId: z.string().trim().min(1).optional(),

    paymentMethod: z
      .enum(["CASH", "BANK_TRANSFER", "CCP", "OTHER"])
      .optional(),

    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
      .optional(),

    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
      .optional(),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (query) =>
      !query.startDate ||
      !query.endDate ||
      query.startDate <= query.endDate,
    {
      message: "startDate must be before or equal to endDate",
      path: ["endDate"],
    }
  )
  .refine(
    (query) =>
      (!query.startDate ||
        !Number.isNaN(Date.parse(`${query.startDate}T00:00:00.000Z`))) &&
      (!query.endDate ||
        !Number.isNaN(Date.parse(`${query.endDate}T00:00:00.000Z`))),
    {
      message: "Invalid calendar date",
      path: ["startDate"],
    }
  );
  
// export const getPaymentsQuerySchema = z.object({
//   status: paymentStatusEnum.optional(),
//   month: z
//     .string()
//     .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
//     .optional(),
//   search: z.string().optional(),
//   groupId: z.string().optional(),
// });

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



