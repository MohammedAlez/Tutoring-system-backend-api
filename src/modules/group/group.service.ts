import { GroupType, Prisma } from "../../../generated/prisma";
import { prisma } from "../../lib/prisma";

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