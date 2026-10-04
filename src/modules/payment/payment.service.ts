import { PaymentStatus, Prisma } from "../../../generated/prisma";
import { prisma } from "../../lib/prisma";
import type { CreatePaymentInput, GetPaymentsQuery, UpdatePaymentInput } from "./validations";

export const getPayments = async (tutorId: string, filters: GetPaymentsQuery) => {
  const where: Prisma.PaymentWhereInput = { tutorId };

  if (filters.status) {
    where.status = filters.status;
  }

  // Filter payments by student's group membership
  if (filters.groupId) {
    where.student = {
      groupStudents: {
        some: { groupId: filters.groupId },
      },
    };
  }

  // Filter by Month (e.g., "2026-10")
  if (filters.month) {
    const [year, month] = filters.month.split("-").map(Number);
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    where.OR = [
      { dueDate: { gte: startOfMonth, lte: endOfMonth } },
      { periodStart: { gte: startOfMonth, lte: endOfMonth } },
    ];
  }

  // Search by Student Name or Phone Number
  if (filters.search && filters.search.trim() !== "") {
    const searchTerm = filters.search.trim();
    const studentSearchCondition: Prisma.StudentWhereInput = {
      OR: [
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm } },
      ],
    };

    where.student = where.student
      ? { ...where.student, ...studentSearchCondition }
      : studentSearchCondition;
  }

  // Calculate Aggregated Stats for the tutor
  const baseWhere: Prisma.PaymentWhereInput = { tutorId };
  if (filters.month) {
    const [year, month] = filters.month.split("-").map(Number);
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    baseWhere.OR = [
      { dueDate: { gte: startOfMonth, lte: endOfMonth } },
      { periodStart: { gte: startOfMonth, lte: endOfMonth } },
    ];
  }

  const [statsAggregate, totalInvoices] = await Promise.all([
    prisma.payment.groupBy({
      by: ["status"],
      where: baseWhere,
      _sum: { amount: true },
    }),
    prisma.payment.count({ where: baseWhere }),
  ]);

  let totalCollected = 0;
  let pendingAmount = 0;
  let overdueAmount = 0;

  statsAggregate.forEach((stat) => {
    const sum = stat._sum.amount ? Number(stat._sum.amount) : 0;
    if (stat.status === PaymentStatus.PAID) totalCollected = sum;
    if (stat.status === PaymentStatus.PENDING) pendingAmount = sum;
    if (stat.status === PaymentStatus.OVERDUE) overdueAmount = sum;
  });

  // Query Payments List with Student & associated Group Details
  const payments = await prisma.payment.findMany({
    where,
    select: {
      id: true,
      studentId: true,
      amount: true,
      status: true,
      dueDate: true,
      paidAt: true,
      periodStart: true,
      periodEnd: true,
      paymentMethod: true,
      note: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          groupStudents: {
            select: {
              group: {
                select: {
                  id: true,
                  name: true,
                  subject: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { dueDate: "desc" },
  });

  // Map response to extract group metadata and convert Decimal to number
  const formattedPayments = payments.map((p) => {
    const { groupStudents, ...studentData } = p.student;
    const group = groupStudents[0]?.group || null;

    return {
      id: p.id,
      studentId: p.studentId,
      amount: Number(p.amount),
      status: p.status,
      dueDate: p.dueDate,
      paidAt: p.paidAt,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      paymentMethod: p.paymentMethod,
      note: p.note,
      student: studentData,
      group,
    };
  });

  return {
    stats: {
      totalCollected,
      pendingAmount,
      overdueAmount,
      totalInvoices,
    },
    payments: formattedPayments,
  };
};

export const createPayment = async (tutorId: string, data: CreatePaymentInput) => {
  let paidAtDate = data.paidAt ?? null;
  if (data.status === PaymentStatus.PAID && !paidAtDate) {
    paidAtDate = new Date();
  }

  const newPayment = await prisma.payment.create({
    data: {
      tutorId,
      studentId: data.studentId,
      amount: data.amount,
      status: data.status,
      dueDate: data.dueDate ?? null,
      paidAt: paidAtDate,
      periodStart: data.periodStart ?? null,
      periodEnd: data.periodEnd ?? null,
      paymentMethod: data.paymentMethod ?? null,
      note: data.note ?? null,
    },
    select: {
      id: true,
      studentId: true,
      amount: true,
      status: true,
      dueDate: true,
      paidAt: true,
      periodStart: true,
      periodEnd: true,
      paymentMethod: true,
      note: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          groupStudents: {
            select: {
              group: {
                select: {
                  id: true,
                  name: true,
                  subject: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const { groupStudents, ...studentData } = newPayment.student;
  const group = groupStudents[0]?.group || null;

  return {
    id: newPayment.id,
    studentId: newPayment.studentId,
    amount: Number(newPayment.amount),
    status: newPayment.status,
    dueDate: newPayment.dueDate,
    paidAt: newPayment.paidAt,
    periodStart: newPayment.periodStart,
    periodEnd: newPayment.periodEnd,
    paymentMethod: newPayment.paymentMethod,
    note: newPayment.note,
    student: studentData,
    group,
  };
};

export const updatePayment = async (
  tutorId: string,
  paymentId: string,
  data: UpdatePaymentInput
) => {
  const existingPayment = await prisma.payment.findFirst({
    where: { id: paymentId, tutorId },
  });

  if (!existingPayment) {
    throw new Error("Payment record not found");
  }

  const updateData: Prisma.PaymentUpdateInput = {};

  if (data.status !== undefined) updateData.status = data.status;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
  if (data.note !== undefined) updateData.note = data.note;
  if (data.periodStart !== undefined) updateData.periodStart = data.periodStart;
  if (data.periodEnd !== undefined) updateData.periodEnd = data.periodEnd;

  if (data.paidAt !== undefined) {
    updateData.paidAt = data.paidAt;
  } else if (data.status === PaymentStatus.PAID && !existingPayment.paidAt) {
    updateData.paidAt = new Date();
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: updateData,
    select: {
      id: true,
      studentId: true,
      amount: true,
      status: true,
      dueDate: true,
      paidAt: true,
      periodStart: true,
      periodEnd: true,
      paymentMethod: true,
      note: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          groupStudents: {
            select: {
              group: {
                select: {
                  id: true,
                  name: true,
                  subject: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const { groupStudents, ...studentData } = updated.student;
  const group = groupStudents[0]?.group || null;

  return {
    id: updated.id,
    studentId: updated.studentId,
    amount: Number(updated.amount),
    status: updated.status,
    dueDate: updated.dueDate,
    paidAt: updated.paidAt,
    periodStart: updated.periodStart,
    periodEnd: updated.periodEnd,
    paymentMethod: updated.paymentMethod,
    note: updated.note,
    student: studentData,
    group,
  };
};