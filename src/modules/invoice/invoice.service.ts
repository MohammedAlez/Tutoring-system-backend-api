import { Prisma } from "../../../generated/prisma";
import { AppError } from "../../errors/app-error";
import { prisma } from "../../lib/prisma";
import { GetInvoicesQuery, UpdateInvoiceInput } from "./validation";



const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const getInvoices = async (
  tutorId: string,
  filters: GetInvoicesQuery,
) => {
  const {
    status,
    studentId,
    groupId,
    month,
    dueDateFrom,
    dueDateTo,
    page,
    limit,
  } = filters;

  let periodStart: Date | undefined;
  let nextMonthStart: Date | undefined;

  if (month) {
    const [year, monthNumber] = month.split("-").map(Number);

    periodStart = new Date(Date.UTC(year, monthNumber - 1, 1));
    nextMonthStart = new Date(Date.UTC(year, monthNumber, 1));
  }

  const dueDateToExclusive = dueDateTo
    ? new Date(
        new Date(`${dueDateTo}T00:00:00.000Z`).getTime() +
          ONE_DAY_MS,
      )
    : undefined;

  const where: Prisma.InvoiceWhereInput = {
    tutorId,

    ...(status && { status }),
    ...(studentId && { studentId }),

    ...(groupId && {
      enrollment: { groupId },
    }),

    ...(periodStart &&
      nextMonthStart && {
        periodStart: { lt: nextMonthStart },
        periodEnd: { gt: periodStart },
      }),

    ...((dueDateFrom || dueDateToExclusive) && {
      dueDate: {
        ...(dueDateFrom && {
          gte: new Date(`${dueDateFrom}T00:00:00.000Z`),
        }),
        ...(dueDateToExclusive && {
          lt: dueDateToExclusive,
        }),
      },
    }),
  };

  const [invoices, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
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
                subject: true,
                type: true,
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paidAt: true,
            paymentMethod: true,
          },
          orderBy: { paidAt: "desc" },
        },
      },
      orderBy: [
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),

    prisma.invoice.count({ where }),
  ]);

  return {
    invoices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};


export const getInvoiceById = async (
  tutorId: string,
  invoiceId: string,
) => {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      tutorId,
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          level: true,
          school: true,
        },
      },

      enrollment: {
        select: {
          id: true,
          joinedAt: true,
          leftAt: true,
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
      },

      payments: {
        orderBy: {
          paidAt: "desc",
        },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          paymentMethod: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }

  const paidAmount = invoice.payments.reduce(
    (total, payment) => total.plus(payment.amount),
    new Prisma.Decimal(0),
  );

  const outstandingBalance = Prisma.Decimal.max(
    new Prisma.Decimal(0),
    invoice.amount.minus(paidAmount),
  );

  return {
    ...invoice,
    paidAmount,
    outstandingBalance,
  };
};

export const updateInvoice = async (
  tutorId: string,
  invoiceId: string,
  input: UpdateInvoiceInput,
) => {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: {
        id: invoiceId,
        tutorId,
      },
      include: {
        payments: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    if (invoice.status === "CANCELLED") {
      throw new AppError("Cancelled invoices cannot be modified", 409);
    }

    if (invoice.status === "PAID") {
      throw new AppError("Paid invoices cannot be modified", 409);
    }

    // Cancellation is allowed only when no payments have been recorded.
    if (input.status === "CANCELLED") {
      if (invoice.payments.length > 0) {
        throw new AppError(
          "An invoice with recorded payments cannot be cancelled",
          409
        );
      }

      return tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "CANCELLED" },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          enrollment: {
            select: {
              id: true,
              group: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          payments: true,
        },
      });
    }

    const hasPayments = invoice.payments.length > 0;

    if (
      hasPayments &&
      (input.amount !== undefined ||
        input.periodStart !== undefined ||
        input.periodEnd !== undefined)
    ) {
      throw new AppError(
        "Amount and billing period cannot be changed after payments are recorded",
        409     
      );
    }

    const periodStart = input.periodStart
      ? new Date(`${input.periodStart}T00:00:00.000Z`)
      : invoice.periodStart;

    const periodEnd = input.periodEnd
      ? new Date(`${input.periodEnd}T00:00:00.000Z`)
      : invoice.periodEnd;

    if (periodStart >= periodEnd) {
      throw new AppError(
        "periodEnd must be after periodStart",
        400
      );
    }

    return tx.invoice.update({
      where: { id: invoice.id },
      data: {
        ...(input.amount !== undefined && {
          amount: input.amount,
        }),
        ...(input.dueDate !== undefined && {
          dueDate: new Date(`${input.dueDate}T00:00:00.000Z`),
        }),
        ...(input.periodStart !== undefined && {
          periodStart,
        }),
        ...(input.periodEnd !== undefined && {
          periodEnd,
        }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        enrollment: {
          select: {
            id: true,
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        payments: true,
      },
    });
  });
};