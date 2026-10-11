
import { prisma } from "../../lib/prisma";

export const getDashboardStats = async (tutorId: string) => {
  const now = new Date();

  // Start and end of today
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  // Current month
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  );

  const startOfNextMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1,
  );

  // Upcoming billing window: next 7 days
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const [
    totalStudents,
    activeStudents,
    todaySessionsCount,
    monthlyRevenueAgg,
    totalAttendance,
    attendedRecords,
    invoices,
  ] = await Promise.all([
    prisma.student.count({
      where: { tutorId },
    }),

    prisma.student.count({
      where: {
        tutorId,
        status: "ACTIVE",
      },
    }),

    prisma.session.count({
      where: {
        tutorId,
        scheduledStart: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      },
    }),

    // Revenue means money actually received this month.
    prisma.payment.aggregate({
      where: {
        tutorId,
        paidAt: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.attendance.count({
      where: {
        session: { tutorId },
      },
    }),

    // PRESENT and LATE both count as attended.
    prisma.attendance.count({
      where: {
        session: { tutorId },
        status: {
          in: ["PRESENT", "LATE"],
        },
      },
    }),

    // Calculate outstanding balances from invoices and payments.
    prisma.invoice.findMany({
      where: {
        tutorId,
        status: {
          not: "CANCELLED",
        },
      },
      select: {
        id: true,
        amount: true,
        dueDate: true,
        payments: {
          select: {
            amount: true,
          },
        },
      },
    }),
  ]);

  const attendanceRate =
    totalAttendance > 0
      ? Number(
          ((attendedRecords / totalAttendance) * 100).toFixed(1),
        )
      : 0;

  // Use integer cents to avoid floating-point money calculations.
  const toCents = (amount: { toNumber(): number }) =>
    Math.round(amount.toNumber() * 100);

  let outstandingBalanceCents = 0;
  let overdueBalanceCents = 0;
  let dueSoonBalanceCents = 0;

  let unpaidCount = 0;
  let overdueInvoicesCount = 0;
  let dueSoonInvoicesCount = 0;

  for (const invoice of invoices) {
    const invoiceAmountCents = toCents(invoice.amount);

    const paidAmountCents = invoice.payments.reduce(
      (total, payment) => total + toCents(payment.amount),
      0,
    );

    const balanceCents = Math.max(
      0,
      invoiceAmountCents - paidAmountCents,
    );

    // Fully paid invoices do not contribute to outstanding balances.
    if (balanceCents === 0) continue;

    unpaidCount++;
    outstandingBalanceCents += balanceCents;

    if (invoice.dueDate < now) {
      overdueInvoicesCount++;
      overdueBalanceCents += balanceCents;
    } else if (invoice.dueDate <= sevenDaysFromNow) {
      dueSoonInvoicesCount++;
      dueSoonBalanceCents += balanceCents;
    }
  }

  return {
    totalStudents,
    activeStudents,
    todaySessionsCount,
    attendanceRate,

    // Financial statistics
    monthlyRevenue: (monthlyRevenueAgg._sum.amount?.toNumber() ?? 0),
    unpaidCount,
    outstandingBalance: outstandingBalanceCents / 100,
    overdueInvoicesCount,
    overdueBalance: overdueBalanceCents / 100,
    dueSoonInvoicesCount,
    dueSoonBalance: dueSoonBalanceCents / 100,
  };
};
