import { z } from "zod";

export const getStudentsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  level: z.string().optional(),
  subject: z.string().optional(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, { message: "Page must be greater than 0" })
    .optional()
    .default(1),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 100, { message: "Limit must be between 1 and 100" })
    .optional()
    .default(10),
});

export const createStudentSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  level: z.string().optional(),
  school: z.string().optional(),
  subject: z.string().optional(),
  notes: z.string().optional(),
});

export const studentIdParamSchema = z.object({
  id: z.string(),
});

export const updateStudentSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  notes: z.string().optional().nullable(),
  // Add other fields as needed based on the Prisma schema
});