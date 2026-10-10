import { AppError } from "../../errors/app-error";
import { prisma } from "../../lib/prisma";
import { EndEnrollmentInput } from "./validations";


export const getEnrollmentBilling = async (
  tutorId: string,
  enrollmentId: string,
) => {
  const enrollment = await prisma.groupStudent.findFirst({
    where: {
      id: enrollmentId,
      group: {
        tutorId,
      },
    },
    select: {
      id: true,
      groupId: true,
      studentId: true,
      joinedAt: true,
      leftAt: true,
      billingFee: true,
      billingIntervalMonths: true,
      nextBillingDate: true,
      billingEnabled: true,
      createdAt: true,
      updatedAt: true,

      group: {
        select: {
          id: true,
          name: true,
          subject: true,
          level: true,
        },
      },

      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },

      invoices: {
        orderBy: {
          periodStart: "desc",
        },
        select: {
          id: true,
          amount: true,
          status: true,
          periodStart: true,
          periodEnd: true,
          dueDate: true,
          description: true,
          createdAt: true,
          payments: {
            select: {
              amount: true,
            },
          },
        },
      },
    },
  });

  if (!enrollment) {
    throw new AppError("Enrollment not found", 404);
  }

  const invoices = enrollment.invoices.map((invoice) => {
    const totalPaid = invoice.payments.reduce(
      (total, payment) => total + Number(payment.amount),
      0,
    );

    return {
      id: invoice.id,
      amount: invoice.amount,
      status: invoice.status,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      dueDate: invoice.dueDate,
      description: invoice.description,
      createdAt: invoice.createdAt,
      totalPaid,
      balanceDue: Math.max(Number(invoice.amount) - totalPaid, 0),
    };
  });

  const totalInvoiced = invoices.reduce(
    (total, invoice) => total + Number(invoice.amount),
    0,
  );

  const totalPaid = invoices.reduce(
    (total, invoice) => total + invoice.totalPaid,
    0,
  );

  return {
    enrollment: {
      id: enrollment.id,
      joinedAt: enrollment.joinedAt,
      leftAt: enrollment.leftAt,
      billingFee: enrollment.billingFee,
      billingIntervalMonths: enrollment.billingIntervalMonths,
      nextBillingDate: enrollment.nextBillingDate,
      billingEnabled: enrollment.billingEnabled,
      createdAt: enrollment.createdAt,
      updatedAt: enrollment.updatedAt,
    },
    student: enrollment.student,
    group: enrollment.group,
    summary: {
      totalInvoiced,
      totalPaid,
      totalOutstanding: Math.max(totalInvoiced - totalPaid, 0),
      invoiceCount: invoices.length,
    },
    invoices,
  };
};


type UpdateEnrollmentBillingInput = {
  billingFee?: number;
  nextBillingDate?: string;
  billingEnabled?: boolean;
};

export const updateEnrollmentBilling = async (
  tutorId: string,
  enrollmentId: string,
  input: UpdateEnrollmentBillingInput,
) => {
  const enrollment = await prisma.groupStudent.findFirst({
    where: {
      id: enrollmentId,
      group: {
        tutorId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!enrollment) {
    throw new AppError("Enrollment not found", 404);
  }

  const updatedEnrollment = await prisma.groupStudent.update({
    where: {
      id: enrollment.id,
    },
    data: {
      ...(input.billingFee !== undefined && {
        billingFee: input.billingFee,
      }),

      ...(input.nextBillingDate !== undefined && {
        nextBillingDate: new Date(input.nextBillingDate),
      }),

      ...(input.billingEnabled !== undefined && {
        billingEnabled: input.billingEnabled,
      }),
    },
    select: {
      id: true,
      joinedAt: true,
      leftAt: true,
      billingFee: true,
      billingIntervalMonths: true,
      nextBillingDate: true,
      billingEnabled: true,
      updatedAt: true,
    },
  });

  return updatedEnrollment;
};


function getTodayAsUtcDate(): Date {
  return new Date(new Date().toISOString().slice(0, 10));
}

function parseDepartureDate(value?: string): Date {
  if (!value) {
    return getTodayAsUtcDate();
  }

  // Store date-only values consistently at UTC midnight.
  return new Date(`${value}T00:00:00.000Z`);
}


export const endEnrollment = async (
  tutorId: string,
  enrollmentId: string,
  input: EndEnrollmentInput,
) => {
  const departureDate = input.leftAt
    ? new Date(`${input.leftAt}T00:00:00.000Z`)
    : new Date(new Date().toISOString().slice(0, 10));

  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.groupStudent.findFirst({
      where: {
        id: enrollmentId,
        group: {
          tutorId,
        },
      },
      select: {
        id: true,
        leftAt: true,
      },
    });

    if (!enrollment) {
      throw new AppError("Enrollment not found", 404);
    }

    if (enrollment.leftAt !== null) {
      throw new AppError("Enrollment has already ended", 409);
    }

    const result = await tx.groupStudent.updateMany({
      where: {
        id: enrollmentId,
        leftAt: null,
        group: {
          tutorId,
        },
      },
      data: {
        leftAt: departureDate,
        billingEnabled: false,
      },
    });

    if (result.count === 0) {
      throw new AppError("Enrollment has already ended", 409);
    }

    return tx.groupStudent.findUniqueOrThrow({
      where: { id: enrollmentId },
      select: {
        id: true,
        groupId: true,
        studentId: true,
        joinedAt: true,
        leftAt: true,
        billingFee: true,
        billingIntervalMonths: true,
        nextBillingDate: true,
        billingEnabled: true,
        updatedAt: true,
      },
    });
  });
};