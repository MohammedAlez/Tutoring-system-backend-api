import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name cannot be empty").optional(),
  lastName: z.string().min(1, "Last name cannot be empty").optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;