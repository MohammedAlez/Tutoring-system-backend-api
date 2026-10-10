
import { z } from "zod";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date");

const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must use YYYY-MM format");

export const getInvoicesQuerySchema = z
  .object({
    status: z
      .enum([
        "PENDING",
        "PARTIALLY_PAID",
        "PAID",
        "OVERDUE",
        "CANCELLED",
      ])
      .optional(),

    studentId: z.string().trim().min(1).optional(),
    groupId: z.string().trim().min(1).optional(),

    month: monthSchema.optional(),
    dueDateFrom: dateOnlySchema.optional(),
    dueDateTo: dateOnlySchema.optional(),

    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .superRefine((filters, ctx) => {
    if (
      filters.dueDateFrom &&
      filters.dueDateTo &&
      filters.dueDateFrom > filters.dueDateTo
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueDateTo"],
        message: "dueDateTo must be on or after dueDateFrom",
      });
    }
  });

export type GetInvoicesQuery = z.infer<
  typeof getInvoicesQuerySchema
>;


export const invoiceIdParamSchema = z.object({
  id: z.string().trim().min(1, "Invoice ID is required"),
});

const invoiceDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date");

const invoiceAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Amount must have at most 2 decimal places")
  .refine((value) => Number(value) > 0, "Amount must be greater than zero")
  .refine(
    (value) => value.split(".")[0].length <= 8,
    "Amount cannot exceed 99999999.99",
  );

export const updateInvoiceSchema = z
  .object({
    amount: invoiceAmountSchema.optional(),
    dueDate: invoiceDateSchema.optional(),
    periodStart: invoiceDateSchema.optional(),
    periodEnd: invoiceDateSchema.optional(),
    description: z.string().trim().max(500).nullable().optional(),
    status: z.literal("CANCELLED").optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update",
  )
  .refine(
    (data) =>
      !data.status ||
      Object.keys(data).length === 1,
    "Cancellation cannot be combined with other updates",
  )
  .superRefine((data, ctx) => {
    if (
      data.periodStart &&
      data.periodEnd &&
      data.periodStart >= data.periodEnd
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["periodEnd"],
        message: "periodEnd must be after periodStart",
      });
    }
  });


export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;