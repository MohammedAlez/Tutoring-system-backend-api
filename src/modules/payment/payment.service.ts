import { PaymentStatus } from "../../../generated/prisma";
import { prisma } from "../../lib/prisma";

export const getPaymentsList = async (tutorId: string, status?: PaymentStatus, limit: number = 10) => {
  const [payments, outstandingAgg] = await Promise.all([
    prisma.payment.findMany({
      where: {
        tutorId,
        ...(status && { status }),
      },
      take: limit,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    }),
    prisma.payment.aggregate({
      where: {
        tutorId,
        status: { in: ["PENDING", "OVERDUE"] },
      },
      _sum: { amount: true },
    }),
  ]);

  // Convert Prisma Decimal to standard JS numbers for JSON serialization
  const serializedPayments = payments.map((payment) => ({
    ...payment,
    amount: payment.amount.toNumber(),
  }));

  return {
    data: serializedPayments,
    totalOutstanding: outstandingAgg._sum.amount?.toNumber() || 0,
  };
};