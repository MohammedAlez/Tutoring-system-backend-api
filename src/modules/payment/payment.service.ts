import { PaymentMethod, PaymentStatus } from "../../../generated/prisma";
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

export const updatePaymentStatus = async (
  tutorId: string,
  paymentId: string,
  data: {
    status: PaymentStatus;
    paymentMethod?: PaymentMethod;
    paidAt?: string;
  }
) => {
  const result = await prisma.payment.updateMany({
    where: { id: paymentId, tutorId }, // Ensure ownership[cite: 6]
    data: {
      status: data.status,
      paymentMethod: data.paymentMethod,
      paidAt: data.paidAt ? new Date(data.paidAt) : null,
    },
  });

  if (result.count === 0) return null;

  const updatedPayment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  return {
    ...updatedPayment,
    amount: updatedPayment!.amount.toNumber(),
  };
};