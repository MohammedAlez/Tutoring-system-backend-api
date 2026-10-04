import { AttendanceStatus, DayOfWeek, Prisma, SessionStatus } from "../../../generated/prisma";
import { prisma } from "../../lib/prisma";

export const getSessionsByDate = async (tutorId: string, dateString: string) => {
  const targetDate = new Date(dateString);
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

  const sessions = await prisma.session.findMany({
    where: {
      tutorId,
      scheduledStart: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          type: true,
          subject: true,
          level: true,
        },
      },
    },
    orderBy: {
      scheduledStart: "asc",
    },
  });

  return sessions;
};

// export const getSessions = async (
//   tutorId: string,
//   filters: { startDate: string; endDate: string; groupId?: string; status?: SessionStatus }
// ) => {
//   const start = new Date(filters.startDate);
//   const end = new Date(filters.endDate);
//   // Ensure full day coverage if date string (YYYY-MM-DD) is passed
//   if (filters.endDate.length === 10) {
//     end.setHours(23, 59, 59, 999);
//   }

//   const where: Prisma.SessionWhereInput = {
//     tutorId,
//     scheduledStart: {
//       gte: start,
//       lte: end,
//     },
//   };

//   if (filters.groupId) where.groupId = filters.groupId;
//   if (filters.status) where.status = filters.status;

//   return prisma.session.findMany({
//     where,
//     select: {
//       id: true,
//       groupId: true,
//       scheduledStart: true,
//       scheduledEnd: true,
//       actualStart: true,
//       actualEnd: true,
//       status: true,
//       room: true,
//       isOnline: true,
//       cancellationReason: true,
//       group: {
//         select: {
//           id: true,
//           name: true,
//           type: true,
//           subject: true,
//           level: true,
//         },
//       },
//       _count: {
//         select: { attendance: true },
//       },
//     },
//     orderBy: { scheduledStart: "asc" },
//   });
// };

export const getSessionById = async (tutorId: string, sessionId: string) => {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, tutorId },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          type: true,
          subject: true,
          level: true,
          students: {
            select: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
      attendance: {
        select: {
          id: true,
          studentId: true,
          status: true,
          note: true,
        },
      },
    },
  });

  if (!session) return null;

  // Format attendance list: map all group students and merge existing attendance record if available
  const attendanceMap = new Map(session.attendance.map((a) => [a.studentId, a]));

  const studentAttendanceList = session.group.students.map((gs) => {
    const student = gs.student;
    const existingAttendance = attendanceMap.get(student.id);

    return {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone,
      attendanceId: existingAttendance?.id || null,
      status: existingAttendance?.status || null, // null if not recorded yet
      note: existingAttendance?.note || null,
    };
  });

  return {
    id: session.id,
    groupId: session.groupId,
    groupName: session.group.name,
    groupType: session.group.type,
    subject: session.group.subject,
    level: session.group.level,
    scheduledStart: session.scheduledStart,
    scheduledEnd: session.scheduledEnd,
    actualStart: session.actualStart,
    actualEnd: session.actualEnd,
    status: session.status,
    room: session.room,
    isOnline: session.isOnline,
    cancellationReason: session.cancellationReason,
    students: studentAttendanceList,
  };
};

export const updateSession = async (
  tutorId: string,
  sessionId: string,
  data: Prisma.SessionUpdateInput
) => {
  const result = await prisma.session.updateMany({
    where: { id: sessionId, tutorId },
    data,
  });

  if (result.count === 0) return null;

  return prisma.session.findUnique({ where: { id: sessionId } });
};

export const saveBulkAttendance = async (
  tutorId: string,
  sessionId: string,
  attendanceData: Array<{ studentId: string; status: AttendanceStatus; note?: string | null }>
) => {
  // Validate session ownership
  const session = await prisma.session.findFirst({ where: { id: sessionId, tutorId } });
  if (!session) throw new Error("Session not found");

  // Perform bulk upserts in transaction
  const operations = attendanceData.map((item) =>
    prisma.attendance.upsert({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: item.studentId,
        },
      },
      create: {
        sessionId,
        studentId: item.studentId,
        status: item.status,
        note: item.note,
      },
      update: {
        status: item.status,
        note: item.note,
      },
    })
  );

  // Automatically switch session status to COMPLETED if it was SCHEDULED
  if (session.status === "SCHEDULED") {
    operations.push(
      prisma.session.update({
        where: { id: sessionId },
        data: { status: "COMPLETED", actualStart: session.actualStart || session.scheduledStart },
      }) as any
    );
  }

  await prisma.$transaction(operations);

  return getSessionById(tutorId, sessionId);
};

// ===================================================
// new get session using just in time creation for sessions
// ===================================================

// Map JavaScript Date.getDay() (0 = Sunday, 1 = Monday, ...) to Prisma DayOfWeek Enum
const DAY_MAP: Record<number, DayOfWeek> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

/**
 * Helper to construct a Date object combining a YYYY-MM-DD date with an "HH:mm" time string.
 */
const buildDateTime = (baseDate: Date, timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

export const getSessions = async (
  tutorId: string,
  filters: { startDate: string; endDate: string; groupId?: string; status?: SessionStatus }
) => {
  const start = new Date(filters.startDate);
  const end = new Date(filters.endDate);

  // Normalize end date to cover the entire final day (23:59:59.999)
  if (filters.endDate.length === 10) {
    end.setHours(23, 59, 59, 999);
  }

  // 1. Fetch active weekly schedule rules for this tutor (filtered by groupId if provided)
  const scheduleWhere: Prisma.ScheduleWhereInput = { tutorId };
  if (filters.groupId) scheduleWhere.groupId = filters.groupId;

  const schedules = await prisma.schedule.findMany({
    where: scheduleWhere,
    select: {
      groupId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      room: true,
      isOnline: true,
    },
  });

  // 2. Fetch existing session records in the date range to avoid duplicates
  const existingWhere: Prisma.SessionWhereInput = {
    tutorId,
    scheduledStart: { gte: start, lte: end },
  };
  if (filters.groupId) existingWhere.groupId = filters.groupId;

  const existingSessions = await prisma.session.findMany({
    where: existingWhere,
    select: {
      groupId: true,
      scheduledStart: true,
    },
  });

  // Create a fast lookup Set for existing session timestamps: "groupId_timestamp"
  const existingSessionKeys = new Set(
    existingSessions.map(
      (s) => `${s.groupId}_${new Date(s.scheduledStart).getTime()}`
    )
  );

  // 3. Calculate missing sessions between start and end dates based on recurring schedules
  const sessionsToCreate: Prisma.SessionCreateManyInput[] = [];
  const currentDate = new Date(start);

  // Iterate day by day through the requested date range
  while (currentDate <= end) {
    const dayOfWeekEnum = DAY_MAP[currentDate.getDay()];
    const matchingSchedules = schedules.filter((s) => s.dayOfWeek === dayOfWeekEnum);

    for (const schedule of matchingSchedules) {
      const scheduledStart = buildDateTime(currentDate, schedule.startTime);
      const scheduledEnd = buildDateTime(currentDate, schedule.endTime);

      // Verify slot falls strictly within the requested filter range
      if (scheduledStart >= start && scheduledStart <= end) {
        const key = `${schedule.groupId}_${scheduledStart.getTime()}`;

        // If no concrete session exists yet for this group + time, queue it for insertion
        if (!existingSessionKeys.has(key)) {
          sessionsToCreate.push({
            tutorId,
            groupId: schedule.groupId,
            scheduledStart,
            scheduledEnd,
            status: "SCHEDULED",
            room: schedule.room,
            isOnline: schedule.isOnline,
          });

          // Prevent duplicate queues within the same iteration loop
          existingSessionKeys.add(key);
        }
      }
    }

    // Advance to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 4. Perform bulk creation for missing slots if any were detected
  if (sessionsToCreate.length > 0) {
    await prisma.session.createMany({
      data: sessionsToCreate,
      skipDuplicates: true,
    });
  }

  // 5. Query and return all complete session records from DB with proper selections
  const where: Prisma.SessionWhereInput = {
    tutorId,
    scheduledStart: { gte: start, lte: end },
  };

  if (filters.groupId) where.groupId = filters.groupId;
  if (filters.status) where.status = filters.status;

  return prisma.session.findMany({
    where,
    select: {
      id: true,
      groupId: true,
      scheduledStart: true,
      scheduledEnd: true,
      actualStart: true,
      actualEnd: true,
      status: true,
      room: true,
      isOnline: true,
      cancellationReason: true,
      group: {
        select: {
          id: true,
          name: true,
          type: true,
          subject: true,
          level: true,
        },
      },
      _count: {
        select: { attendance: true },
      },
    },
    orderBy: { scheduledStart: "asc" },
  });
};