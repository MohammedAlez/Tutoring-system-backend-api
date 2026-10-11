import { InvoiceStatus, Prisma } from "../../../../generated/prisma";
import { AppError } from "../../../errors/app-error";
import { prisma } from "../../../lib/prisma";
import { CreateInvoicePaymentInput } from "./validation";


export const createInvoicePayment = async (
  tutorId: string,
  invoiceId: string,
  data: CreateInvoicePaymentInput
) => {
  const paymentAmount = new Prisma.Decimal(data.amount);
  const paidAt = data.paidAt ?? new Date();

  return prisma.$transaction(
    async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: invoiceId,
          tutorId,
        },
        select: {
          id: true,
          tutorId: true,
          studentId: true,
          amount: true,
          status: true,
          dueDate: true,
        },
      });

      if (!invoice) {
        throw new AppError("Invoice not found", 404);
      }

      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new AppError(
          "Cannot record a payment against a cancelled invoice",
          400
        );
      }

      const aggregate = await tx.payment.aggregate({
        where: {
          tutorId,
          invoiceId: invoice.id,
        },
        _sum: {
          amount: true,
        },
      });

      const totalPaid =
        aggregate._sum.amount ?? new Prisma.Decimal(0);

      const outstandingBalance = invoice.amount.minus(totalPaid);

      if (outstandingBalance.lessThanOrEqualTo(0)) {
        throw new AppError(
          "This invoice has already been fully paid",
          400
        );
      }

      if (paymentAmount.greaterThan(outstandingBalance)) {
        throw new AppError(
          `Payment exceeds the outstanding balance of ${outstandingBalance.toFixed(2)}`,
          400
        );
      }

      const payment = await tx.payment.create({
        data: {
          tutorId,
          invoiceId: invoice.id,
          studentId: invoice.studentId,
          amount: paymentAmount,
          paidAt,
          paymentMethod: data.paymentMethod,
          note: data.note ?? null,
        },
        select: {
          id: true,
          invoiceId: true,
          studentId: true,
          amount: true,
          paidAt: true,
          paymentMethod: true,
          note: true,
          createdAt: true,
        },
      });

      const newTotalPaid = totalPaid.plus(paymentAmount);
      const newBalance = invoice.amount.minus(newTotalPaid);

      let newStatus: InvoiceStatus;

      if (newBalance.lessThanOrEqualTo(0)) {
        newStatus = InvoiceStatus.PAID;
      } else if (invoice.dueDate < new Date()) {
        newStatus = InvoiceStatus.OVERDUE;
      } else {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      await tx.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          status: newStatus,
        },
      });

      return {
        payment: {
          ...payment,
          amount: Number(payment.amount),
        },
        invoice: {
          id: invoice.id,
          amount: Number(invoice.amount),
          status: newStatus,
          totalPaid: Number(newTotalPaid),
          outstandingBalance: Number(newBalance),
        },
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
};

export const getInvoicePayments = async (
    tutorId: string,
    invoiceId: string
) => {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      tutorId,
    },
    select: {
      id: true,
      payments: {
        where: {
          tutorId,
        },
        orderBy: {
          paidAt: 'desc',
        },
      },
    },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  return invoice.payments;
};