import { z } from "zod";

export const groupIdParamSchema = z.object({
  groupId: z.string(),
});

export const enrollStudentSchema = z.object({
  studentId: z.string(),
});

export const unenrollStudentParamsSchema = z.object({
  groupId: z.string(),
  studentId: z.string(),
});