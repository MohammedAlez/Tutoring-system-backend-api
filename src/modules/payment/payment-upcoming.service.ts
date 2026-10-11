import { Prisma } from "../../../generated/prisma";
import { prisma } from "../../lib/prisma";

const DUE_SOON_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const getUpcomingPayments = async (tutorId: string) => {
  const now = new Date();
  const dueSoonDate = new Date(
    now.getTime() + DUE_SOON_DAYS * MS_PER_DAY
  );

  const invoices = await prisma.invoice.findMany({
    where: {
      tutorId,
      status: { not: "CANCELLED" },
      dueDate: { lte: dueSoonDate },
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      enrollment: {
        select: {
          id: true,
          group: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
      payments: {
        where: { tutorId },
        select: { amount: true },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  const upcomingPayments = invoices
    .map((invoice) => {
      const paidAmount = invoice.payments.reduce(
        (total, payment) => total.plus(payment.amount),
        new Prisma.Decimal(0)
      );

      const balance = invoice.amount.minus(paidAmount);

      const { payments, ...invoiceDetails } = invoice;

      const attentionStatus =
        invoice.dueDate < now ? "OVERDUE" : "DUE_SOON";

      const daysDifference = Math.ceil(
        (invoice.dueDate.getTime() - now.getTime()) / MS_PER_DAY
      );

      return {
        ...invoiceDetails,
        outstandingBalance: balance.gt(0) ? balance.toFixed(2) : "0.00",
        attentionStatus,
        daysUntilDue:
          attentionStatus === "DUE_SOON" ? Math.max(0, daysDifference) : null,
        daysOverdue:
          attentionStatus === "OVERDUE"
            ? Math.floor(
                (now.getTime() - invoice.dueDate.getTime()) / MS_PER_DAY
              )
            : null,
      };
    })
    .filter((invoice) => Number(invoice.outstandingBalance) > 0)
    .sort((a, b) => {
      // Overdue invoices appear before invoices due soon.
      if (a.attentionStatus !== b.attentionStatus) {
        return a.attentionStatus === "OVERDUE" ? -1 : 1;
      }

      return a.dueDate.getTime() - b.dueDate.getTime();
    });

  return {
    invoices: upcomingPayments,
    summary: {
      total: upcomingPayments.length,
      overdue: upcomingPayments.filter(
        (invoice) => invoice.attentionStatus === "OVERDUE"
      ).length,
      dueSoon: upcomingPayments.filter(
        (invoice) => invoice.attentionStatus === "DUE_SOON"
      ).length,
      outstandingAmount: upcomingPayments
        .reduce(
          (total, invoice) =>
            total.plus(new Prisma.Decimal(invoice.outstandingBalance)),
          new Prisma.Decimal(0)
        )
        .toFixed(2),
      dueSoonDays: DUE_SOON_DAYS,
    },
    asOf: now.toISOString(),
  };
};