import { z } from "zod";

export const groupIdParamSchema = z.object({
  groupId: z.string(),
});

export const getGroupsSchema = z.object({
  type: z.enum(["ALL", "GROUP", "INDIVIDUAL"]).optional().default("ALL"),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  search: z.string().optional(),
});

export const createGroupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters"),
  type: z.enum(["GROUP", "INDIVIDUAL"]),
  subject: z.string().optional().nullable(),
  level: z.string().optional().nullable(),
  room: z.string().optional().nullable(),
  isOnline: z.boolean().optional().default(false),
});

export const updateGroupSchema = createGroupSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const enrollStudentSchema = z.object({
  studentId: z.string(),
});

export const unenrollStudentParamsSchema = z.object({
  groupId: z.string(),
  studentId: z.string(),
});

export const addScheduleSchema = z.object({
  dayOfWeek: z.enum([
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ]),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
  room: z.string().optional().nullable(),
  isOnline: z.boolean().optional().default(false),
});

export const scheduleIdParamSchema = z.object({
  groupId: z.string(),
  scheduleId: z.string(),
});