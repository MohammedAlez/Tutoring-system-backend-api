import { prisma } from "../../lib/prisma";

export const getTutorSchedules = async (tutorId: string) => {
  return prisma.schedule.findMany({
    where: { tutorId },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          type: true,
          subject: true,
          level: true,
          status: true,
        },
      },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
};