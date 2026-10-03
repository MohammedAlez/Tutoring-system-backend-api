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