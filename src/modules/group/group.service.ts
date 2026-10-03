import { DayOfWeek, GroupType, Prisma,  } from "../../../generated/prisma";
import { prisma,  } from "../../lib/prisma";

const formatDayName = (dayEnum: string): string => {
  return dayEnum.charAt(0) + dayEnum.slice(1).toLowerCase();
};

export const getGroupsList = async (
  tutorId: string,
  filters: { type?: "ALL" | "GROUP" | "INDIVIDUAL"; status?: "ACTIVE" | "INACTIVE"; search?: string }
) => {
  const where: Prisma.GroupWhereInput = { tutorId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.type && filters.type !== "ALL") {
    where.type = filters.type;
  }

  if (filters.search && filters.search.trim() !== "") {
    const searchTerm = filters.search.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { subject: { contains: searchTerm, mode: "insensitive" } },
      { level: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  const groups = await prisma.group.findMany({
    where,
    select: {
      id: true,
      name: true,
      type: true,
      subject: true,
      level: true,
      room: true,
      isOnline: true,
      status: true,
      createdAt: true,
      _count: {
        select: { students: true },
      },
      schedules: {
        select: {
          dayOfWeek: true,
          startTime: true,
          endTime: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    type: group.type,
    subject: group.subject,
    level: group.level,
    room: group.room,
    isOnline: group.isOnline,
    status: group.status,
    createdAt: group.createdAt,
    _count: {
      students: group._count.students,
    },
    schedules: group.schedules.map((s) => ({
      day: formatDayName(s.dayOfWeek),
      startTime: s.startTime,
      endTime: s.endTime,
    })),
  }));
};

export const createGroup = async (
  tutorId: string,
  data: {
    name: string;
    type: GroupType;
    subject?: string | null;
    level?: string | null;
    room?: string | null;
    isOnline?: boolean;
  }
) => {
  return prisma.group.create({
    data: {
      ...data,
      tutorId,
    },
    select: {
      id: true,
      name: true,
      type: true,
      subject: true,
      level: true,
      room: true,
      isOnline: true,
      status: true,
      createdAt: true,
    },
  });
};

export const updateGroup = async (
  tutorId: string,
  groupId: string,
  data: Prisma.GroupUpdateInput
) => {
  const result = await prisma.group.updateMany({
    where: { id: groupId, tutorId },
    data,
  });

  if (result.count === 0) return null;

  return prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      type: true,
      subject: true,
      level: true,
      room: true,
      isOnline: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const enrollStudentInGroup = async (
  tutorId: string,
  groupId: string,
  studentId: string
) => {
  const group = await prisma.group.findFirst({ where: { id: groupId, tutorId } });
  const student = await prisma.student.findFirst({ where: { id: studentId, tutorId } });

  if (!group || !student) throw new Error("Group or Student not found");

  return prisma.groupStudent.create({
    data: { groupId, studentId },
  });
};

export const unenrollStudentFromGroup = async (
  tutorId: string,
  groupId: string,
  studentId: string
) => {
  const group = await prisma.group.findFirst({ where: { id: groupId, tutorId } });
  if (!group) throw new Error("Group not found");

  await prisma.groupStudent.delete({
    where: {
      groupId_studentId: { groupId, studentId },
    },
  });
};

export const getGroupDetails = async (tutorId: string, groupId: string) => {
  const group = await prisma.group.findFirst({
    where: { id: groupId, tutorId },
    select: {
      id: true,
      name: true,
      type: true,
      subject: true,
      level: true,
      room: true,
      isOnline: true,
      status: true,
      createdAt: true,
      schedules: {
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          room: true,
          isOnline: true,
        },
        orderBy: { dayOfWeek: "asc" },
      },
      students: {
        select: {
          joinedAt: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              parentPhone: true,
              status: true,
            },
          },
        },
        orderBy: { student: { lastName: "asc" } },
      },
      _count: {
        select: {
          sessions: true,
          students: true,
        },
      },
    },
  });

  if (!group) return null;

  return {
    ...group,
    students: group.students.map((gs) => ({
      ...gs.student,
      joinedAt: gs.joinedAt,
    })),
  };
};

export const addGroupSchedule = async (
  tutorId: string,
  groupId: string,
  data: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    room?: string | null;
    isOnline?: boolean;
  }
) => {
  const group = await prisma.group.findFirst({ where: { id: groupId, tutorId } });
  if (!group) throw new Error("Group not found");

  return prisma.schedule.create({
    data: {
      tutorId,
      groupId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      room: data.room ?? group.room,
      isOnline: data.isOnline ?? group.isOnline,
    },
  });
};

export const deleteGroupSchedule = async (tutorId: string, groupId: string, scheduleId: string) => {
  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, groupId, tutorId },
  });

  if (!schedule) throw new Error("Schedule entry not found");

  await prisma.schedule.delete({ where: { id: scheduleId } });
};

export const getGroupAttendanceStats = async (tutorId: string, groupId: string) => {
  const group = await prisma.group.findFirst({
    where: { id: groupId, tutorId },
    include: {
      students: {
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      sessions: {
        where: { status: "COMPLETED" },
        select: { id: true },
      },
    },
  });

  if (!group) throw new Error("Group not found");

  const totalCompletedSessions = group.sessions.length;
  const sessionIds = group.sessions.map((s) => s.id);

  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      sessionId: { in: sessionIds },
    },
    select: {
      studentId: true,
      status: true,
    },
  });

  const studentStats = group.students.map((gs) => {
    const student = gs.student;
    const records = attendanceRecords.filter((a) => a.studentId === student.id);

    const presentCount = records.filter((r) => r.status === "PRESENT").length;
    const lateCount = records.filter((r) => r.status === "LATE").length;
    const absentCount = records.filter((r) => r.status === "ABSENT").length;
    const excusedCount = records.filter((r) => r.status === "EXCUSED").length;

    // Attended = PRESENT + LATE
    const attendedSessions = presentCount + lateCount;
    const attendancePercentage =
      totalCompletedSessions > 0
        ? Math.round((attendedSessions / totalCompletedSessions) * 100)
        : 0;

    return {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      stats: {
        totalSessions: totalCompletedSessions,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        excused: excusedCount,
        attendancePercentage,
      },
    };
  });

  return {
    groupId,
    totalCompletedSessions,
    students: studentStats,
  };
};