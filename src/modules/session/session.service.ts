import { AttendanceStatus, Prisma, SessionStatus } from "../../../generated/prisma";
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

export const getSessions = async (
  tutorId: string,
  filters: { startDate: string; endDate: string; groupId?: string; status?: SessionStatus }
) => {
  const start = new Date(filters.startDate);
  const end = new Date(filters.endDate);
  // Ensure full day coverage if date string (YYYY-MM-DD) is passed
  if (filters.endDate.length === 10) {
    end.setHours(23, 59, 59, 999);
  }

  const where: Prisma.SessionWhereInput = {
    tutorId,
    scheduledStart: {
      gte: start,
      lte: end,
    },
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