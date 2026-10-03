import { Prisma } from "../../../generated/prisma";
import { prisma } from "../../lib/prisma";

export const getStudents = async (
  tutorId: string,
  params: {
    search?: string;
    status?: "ACTIVE" | "INACTIVE";
    level?: string;
    subject?: string;
    page: number;
    limit: number;
  }
) => {
  const { search, status, level, subject, page, limit } = params;
  const skip = (page - 1) * limit;

  // Build dynamic where clause scoped to the authenticated tutor
  const where: Prisma.StudentWhereInput = {
    tutorId,
    ...(status && { status }),
    ...(level && { level: { contains: level, mode: "insensitive" } }),
    ...(subject && { subject: { contains: subject, mode: "insensitive" } }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      include: {
        groupStudents: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return {
    data: students,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const createStudentProfile = async (
  tutorId: string,
  data: {
    firstName: string;
    lastName: string;
    phone?: string;
    parentName?: string;
    parentPhone?: string;
    level?: string;
    school?: string;
    subject?: string;
    notes?: string;
  }
) => {
  const student = await prisma.student.create({
    data: {
      ...data,
      tutorId,
    },
  });

  return student;
};

export const getStudentById = async (tutorId: string, studentId: string) => {
  const student = await prisma.student.findFirst({
    where: { id: studentId, tutorId }, // Ensures the student belongs to the tutor
    include: {
      groupStudents: {
        include: {
          group: {
            select: {
              id: true,
              name: true,
              subject: true,
              level: true,
              room: true,
              isOnline: true,
              status: true,
            },
          },
        },
      },
      attendance: {
        include: {
          session: {
            select: {
              id: true,
              scheduledStart: true,
              scheduledEnd: true,
              group: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        orderBy: { dueDate: "desc" },
      },
    },
  });

  if (!student) return null;

  // Format payments to convert Prisma Decimal to standard JS numbers for JSON
  return {
    ...student,
    payments: student.payments.map((p) => ({
      ...p,
      amount: p.amount.toNumber(),
    })),
  };
};

export const updateStudentProfile = async (
  tutorId: string,
  studentId: string,
  data: any
) => {
  // Use updateMany to safely enforce the tutorId constraint
  const result = await prisma.student.updateMany({
    where: { id: studentId, tutorId },
    data,
  });

  if (result.count === 0) return null;

  return prisma.student.findUnique({ where: { id: studentId } });
};