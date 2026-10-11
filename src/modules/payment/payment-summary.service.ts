import { Prisma } from "../../../generated/prisma";
import { prisma } from "../../lib/prisma";

const DUE_SOON_DAYS = 7;

export const getPaymentsSummary = async (tutorId: string) => {
  const now = new Date();
  const dueSoonDate = new Date(
    now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000
  );

  const [collectedResult, invoices, paymentSums] =
    await prisma.$transaction([
      prisma.payment.aggregate({
        where: { tutorId },
        _sum: { amount: true },
      }),

      prisma.invoice.findMany({
        where: {
          tutorId,
          status: { not: "CANCELLED" },
        },
        select: {
          id: true,
          amount: true,
          dueDate: true,
        },
      }),

      prisma.payment.groupBy({
        by: ["invoiceId"],
        where: { tutorId },
        _sum: { amount: true },
      }),
    ]);

  const paidByInvoice = new Map(
    paymentSums.map((payment) => [
      payment.invoiceId,
      payment._sum.amount ?? new Prisma.Decimal(0),
    ])
  );

  let outstanding = new Prisma.Decimal(0);
  let overdue = new Prisma.Decimal(0);
  let dueSoon = new Prisma.Decimal(0);

  for (const invoice of invoices) {
    const paidAmount =
      paidByInvoice.get(invoice.id) ?? new Prisma.Decimal(0);

    const balance = invoice.amount.minus(paidAmount);

    // Ignore invoices that have no remaining balance.
    if (balance.lte(0)) continue;

    outstanding = outstanding.plus(balance);

    if (invoice.dueDate < now) {
      overdue = overdue.plus(balance);
    } else if (invoice.dueDate <= dueSoonDate) {
      dueSoon = dueSoon.plus(balance);
    }
  }

  return {
    collected: (collectedResult._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
    outstanding: outstanding.toFixed(2),
    overdue: overdue.toFixed(2),
    dueSoon: dueSoon.toFixed(2),
    dueSoonDays: DUE_SOON_DAYS,
    asOf: now.toISOString(),
  };
};