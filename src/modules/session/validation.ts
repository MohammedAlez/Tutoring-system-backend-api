import { z } from "zod";

export const getSessionsSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Expected YYYY-MM-DD",
  }),
});


export const getSessionsQuerySchema = z.object({
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  groupId: z.string().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
});

export const updateSessionSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  actualStart: z.string().datetime().optional().nullable(),
  actualEnd: z.string().datetime().optional().nullable(),
  room: z.string().optional().nullable(),
  isOnline: z.boolean().optional(),
  cancellationReason: z.string().optional().nullable(),
});

export const bulkAttendanceSchema = z.object({
  attendance: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
      note: z.string().optional().nullable(),
    })
  ),
});