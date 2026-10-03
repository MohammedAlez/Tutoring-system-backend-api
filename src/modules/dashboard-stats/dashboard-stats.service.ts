import { prisma } from "../../lib/prisma";

export const getDashboardStats = async (tutorId: string) => {
  const now = new Date();
  
  // Calculate Start and End of Today
  const startOfToday = new Date(now.setHours(0, 0, 0, 0));
  const endOfToday = new Date(now.setHours(23, 59, 59, 999));

  // Calculate Start and End of Current Month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [
    totalStudents,
    activeStudents,
    todaySessionsCount,
    unpaidCount,
    monthlyRevenueAgg,
    totalAttendance,
    presentAttendance,
  ] = await Promise.all([
    prisma.student.count({ where: { tutorId } }),
    prisma.student.count({ where: { tutorId, status: "ACTIVE" } }),
    prisma.session.count({
      where: {
        tutorId,
        scheduledStart: { gte: startOfToday, lte: endOfToday },
      },
    }),
    prisma.payment.count({
      where: {
        tutorId,
        status: { in: ["PENDING", "OVERDUE"] },
      },
    }),
    prisma.payment.aggregate({
      where: {
        tutorId,
        status: "PAID",
        paidAt: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.attendance.count({
      where: { session: { tutorId } },
    }),
    prisma.attendance.count({
      where: { session: { tutorId }, status: "PRESENT" },
    }),
  ]);

  const attendanceRate = totalAttendance > 0 
    ? parseFloat(((presentAttendance / totalAttendance) * 100).toFixed(1)) 
    : 0;

  return {
    totalStudents,
    activeStudents,
    todaySessionsCount,
    unpaidCount,
    attendanceRate,
    monthlyRevenue: monthlyRevenueAgg._sum.amount?.toNumber() || 0,
  };
};