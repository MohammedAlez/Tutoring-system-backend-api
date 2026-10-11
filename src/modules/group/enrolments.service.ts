import { InvoiceStatus, Prisma } from "../../../generated/prisma";
import { AppError } from "../../errors/app-error";
import { prisma } from "../../lib/prisma";
import { EnrollStudentInput } from "./validations";





const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  const originalDay = result.getDate();

  // Avoid overflowing into the following month, e.g. Jan 31 + 1 month.
  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();

  result.setDate(Math.min(originalDay, lastDay));

  return result;
};

export const enrollStudentInGroup = async (
  tutorId: string,
  groupId: string,
  input: EnrollStudentInput,
) => {
  const {
    studentId,
    billingMode,
    billingFee,
    initialInvoiceAmount,
    billingIntervalMonths,
    nextBillingDate,
    periodStart,
    periodEnd,
    dueDate,
  } = input;

  return prisma.$transaction(async (tx) => {
    const group = await tx.group.findFirst({
      where: {
        id: groupId,
        tutorId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (!group) {
      throw new AppError("Group not found", 404);
    }

    const student = await tx.student.findFirst({
      where: {
        id: studentId,
        tutorId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (!student) {
      throw new AppError("Student not found", 404);
    }

    const existingEnrollment = await tx.groupStudent.findFirst({
      where: {
        groupId,
        studentId,
        leftAt: null,
      },
      select: { id: true },
    });

    if (existingEnrollment) {
      throw new AppError(
        "This student is already enrolled in this group",
        409,
      );
    }

    const joinedAt = new Date();

    const invoicePeriodStart = periodStart ?? joinedAt;

    const defaultPeriodEnd = addMonths(invoicePeriodStart, billingIntervalMonths);
    defaultPeriodEnd.setDate(defaultPeriodEnd.getDate() - 1);

    const invoicePeriodEnd = periodEnd ?? defaultPeriodEnd;

    if (invoicePeriodEnd <= invoicePeriodStart) {
      throw new AppError(
        "Invoice period end must be after its start",
        400,
      );
    }

    const invoiceDueDate = dueDate ?? joinedAt;

    // For one-time billing, there is no future recurring invoice.
    const billingEnabled = billingMode === "RECURRING";

    const enrollment = await tx.groupStudent.create({
      data: {
        groupId,
        studentId,
        joinedAt,
        billingFee: new Prisma.Decimal(billingFee),
        billingIntervalMonths,
        billingEnabled,
        nextBillingDate: billingEnabled
          ? nextBillingDate!
          : invoicePeriodEnd,
      },
    });

    const invoice = await tx.invoice.create({
      data: {
        tutorId,
        studentId,
        enrollmentId: enrollment.id,
        amount: new Prisma.Decimal(
          initialInvoiceAmount ?? billingFee,
        ),
        status: InvoiceStatus.PENDING,
        periodStart: invoicePeriodStart,
        periodEnd: invoicePeriodEnd,
        dueDate: invoiceDueDate,
        description:
          billingMode === "RECURRING"
            ? `Initial invoice for ${billingIntervalMonths}-month billing cycle`
            : "One-time invoice",
      },
    });

    return {
      ...enrollment,
      initialInvoice: invoice,
    };
  });
};



// export const unenrollStudentFromGroup = async (

//   tutorId: string,
//   groupId: string,
//   studentId: string,
// ) => {
//   return prisma.$transaction(async (tx) => {
//     const group = await tx.group.findFirst({
//       where: {
//         id: groupId,
//         tutorId,
//       },
//       select: { id: true },
//     });

//     if (!group) {
//       throw new AppError("Group not found", 404);
//     }

//     const enrollment = await tx.groupStudent.findFirst({
//       where: {
//         groupId,
//         studentId,
//         leftAt: null,
//         group: {
//           tutorId,
//         },
//       },
//       select: {
//         id: true,
//       },
//     });

//     if (!enrollment) {
//       throw new AppError(
//         "Active enrollment not found for this student in this group",
//         404,
//       );
//     }

//     const leftAt = new Date();

//     const updatedEnrollment = await tx.groupStudent.update({
//       where: {
//         id: enrollment.id,
//       },
//       data: {
//         leftAt,
//         billingEnabled: false,
//       },
//     });

//     return updatedEnrollment;
//   });
// };


export const unenrollStudentFromGroup = async (
  tutorId: string,
  groupId: string,
  studentId: string,
) => {
  // Use the same default departure date as endEnrollment:
  // today at midnight UTC.
  const departureDate = new Date(
    new Date().toISOString().slice(0, 10),
  );

  return prisma.$transaction(async (tx) => {
    // 1. Verify that the group belongs to this tutor.
    const group = await tx.group.findFirst({
      where: {
        id: groupId,
        tutorId,
      },
      select: {
        id: true,
      },
    });

    if (!group) {
      throw new AppError("Group not found", 404);
    }

    // 2. Find the student's active enrollment in this group.
    const enrollment = await tx.groupStudent.findFirst({
      where: {
        groupId,
        studentId,
        leftAt: null,
        group: {
          tutorId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!enrollment) {
      throw new AppError(
        "Active enrollment not found for this student in this group",
        404,
      );
    }

    // 3. End the enrollment only if it is still active.
    const result = await tx.groupStudent.updateMany({
      where: {
        id: enrollment.id,
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

    // Protect against concurrent requests ending the same enrollment.
    if (result.count === 0) {
      throw new AppError("Enrollment has already ended", 409);
    }

    // 4. Return the updated enrollment, matching endEnrollment.
    return tx.groupStudent.findUniqueOrThrow({
      where: {
        id: enrollment.id,
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
        updatedAt: true,
      },
    });
  });
};