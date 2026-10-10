import { z } from "zod";

export const enrollmentIdParamSchema = z.object({
  id: z.string().min(1, "Enrollment ID is required"),
});


export const updateEnrollmentBillingSchema = z
  .object({
    billingFee: z
      .number()
      .finite()
      .min(0, "Billing fee must be greater than or equal to 0")
      .optional(),

    nextBillingDate: z
      .string()
      .datetime({ offset: true })
      .optional(),

    billingEnabled: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one billing field must be provided",
  );



export const endEnrollmentParamsSchema = z.object({
  id: z.string().trim().min(1, "Enrollment ID is required"),
});

export const endEnrollmentSchema = z
  .object({
    leftAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
      .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`);

        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        );
      }, "Invalid departure date")
      .optional(),
  })
  .strict();

export type EndEnrollmentInput = z.infer<typeof endEnrollmentSchema>;
