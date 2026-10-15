
import { prisma } from "../../lib/prisma";

const MAX_CYCLES_PER_ENROLLMENT_PER_RUN = 120;

type EnrollmentBillingResult = {
  invoicesCreated: number;
  existingInvoicesSkipped: number;
  cyclesProcessed: number;
};

type BillingJobResult = {
  enrollmentsChecked: number;
  enrollmentsProcessed: number;
  invoicesCreated: number;
  existingInvoicesSkipped: number;
  failedEnrollments: number;
};

const startOfUtcDay = (date: Date): Date => {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  );
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

/**
 * Add calendar months while clamping to the last day of the target month.
 *
 * Examples:
 * Jan 31 + 1 month = Feb 28 (or Feb 29 in a leap year)
 * Jan 31 + 2 months = Mar 31
 */
const addMonthsClamped = (
  date: Date,
  months: number,
): Date => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const targetMonthDate = new Date(
    Date.UTC(year, month + months, 1),
  );

  const lastDayOfTargetMonth = new Date(
    Date.UTC(
      targetMonthDate.getUTCFullYear(),
      targetMonthDate.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      targetMonthDate.getUTCFullYear(),
      targetMonthDate.getUTCMonth(),
      Math.min(day, lastDayOfTargetMonth),
    ),
  );
};

const formatDate = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

const getErrorCode = (error: unknown): string | undefined => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    return String(
      (error as { code: unknown }).code,
    );
  }

  return undefined;
};

const processEnrollment = async (
  enrollmentId: string,
  today: Date,
): Promise<EnrollmentBillingResult> => {
  // Retry serialization conflicts and duplicate-invoice races.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const enrollment =
            await tx.groupStudent.findUnique({
              where: { id: enrollmentId },
              select: {
                id: true,
                groupId: true,
                studentId: true,
                billingFee: true,
                billingIntervalMonths: true,
                nextBillingDate: true,
                billingEnabled: true,
                leftAt: true,
                group: {
                  select: {
                    tutorId: true,
                  },
                },
              },
            });

          const emptyResult: EnrollmentBillingResult = {
            invoicesCreated: 0,
            existingInvoicesSkipped: 0,
            cyclesProcessed: 0,
          };

          // Recheck eligibility inside the transaction.
          // The enrollment may have changed after the initial query.
          if (
            !enrollment ||
            enrollment.leftAt !== null ||
            !enrollment.billingEnabled
          ) {
            return emptyResult;
          }

          const interval =
            enrollment.billingIntervalMonths;

          if (!Number.isInteger(interval) || interval < 1) {
            throw new Error(
              `Invalid billing interval for enrollment ${enrollmentId}: ${interval}`,
            );
          }

          if (enrollment.billingFee.lessThan(0)) {
            throw new Error(
              `Invalid billing fee for enrollment ${enrollmentId}`,
            );
          }

          let nextBillingDate = startOfUtcDay(
            enrollment.nextBillingDate,
          );

          let invoicesCreated = 0;
          let existingInvoicesSkipped = 0;
          let cyclesProcessed = 0;

          // Generate every due cycle, including missed cycles.
          while (
            nextBillingDate.getTime() < today.getTime() &&
            cyclesProcessed <
              MAX_CYCLES_PER_ENROLLMENT_PER_RUN
          ) {
            const periodStart = nextBillingDate;

            const nextPeriodStart = addMonthsClamped(
              periodStart,
              interval,
            );

            // Period end is inclusive:
            // the day before the next billing period starts.
            const periodEnd = addDays(nextPeriodStart, -1);

            const existingInvoice =
              await tx.invoice.findUnique({
                where: {
                  enrollmentId_periodStart: {
                    enrollmentId: enrollment.id,
                    periodStart,
                  },
                },
                select: {
                  id: true,
                },
              });

            if (existingInvoice) {
              // The invoice already exists. Do not duplicate it,
              // but repair the billing cursor if necessary.
              existingInvoicesSkipped++;
            } else {
              await tx.invoice.create({
                data: {
                  tutorId: enrollment.group.tutorId,
                  studentId: enrollment.studentId,
                  enrollmentId: enrollment.id,
                  amount: enrollment.billingFee,
                  periodStart,
                  periodEnd,
                  dueDate: periodStart,
                  description:
                    `Recurring tuition fee: ${formatDate(periodStart)} to ${formatDate(periodEnd)}`,
                  // status defaults to PENDING in the schema
                },
              });

              invoicesCreated++;
            }

            // This happens in the same transaction as invoice
            // creation. If creation fails, the date isn't advanced.
            nextBillingDate = nextPeriodStart;

            await tx.groupStudent.update({
              where: { id: enrollment.id },
              data: { nextBillingDate },
            });

            cyclesProcessed++;
          }

          return {
            invoicesCreated,
            existingInvoicesSkipped,
            cyclesProcessed,
          };
        },
        {
          isolationLevel: "Serializable",
        },
      );
    } catch (error) {
      const code = getErrorCode(error);
      const retryable =
        code === "P2034" || code === "P2002";

      if (retryable && attempt < 3) {
        console.warn(
          `[billing] Retrying enrollment ${enrollmentId}; attempt ${attempt + 1}`,
        );
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `Failed to process enrollment ${enrollmentId}`,
  );
};

export const generateRecurringInvoices =
  async (): Promise<BillingJobResult> => {
    const now = new Date();
    const today = startOfUtcDay(now);
    const tomorrow = addDays(today, 1);

    const dueEnrollments =
      await prisma.groupStudent.findMany({
        where: {
          billingEnabled: true,
          leftAt: null,
          nextBillingDate: {
            lt: tomorrow,
          },
        },
        select: {
          id: true,
        },
      });

    const result: BillingJobResult = {
      enrollmentsChecked: dueEnrollments.length,
      enrollmentsProcessed: 0,
      invoicesCreated: 0,
      existingInvoicesSkipped: 0,
      failedEnrollments: 0,
    };

    console.log(
      `[billing] Starting recurring invoice generation at ${now.toISOString()}. Due enrollments: ${dueEnrollments.length}`,
    );

    for (const enrollment of dueEnrollments) {
      try {
        const enrollmentResult =
          await processEnrollment(enrollment.id, tomorrow);

        result.enrollmentsProcessed++;
        result.invoicesCreated +=
          enrollmentResult.invoicesCreated;
        result.existingInvoicesSkipped +=
          enrollmentResult.existingInvoicesSkipped;

        console.log(
          `[billing] Enrollment ${enrollment.id}: ` +
            `${enrollmentResult.invoicesCreated} created, ` +
            `${enrollmentResult.existingInvoicesSkipped} existing, ` +
            `${enrollmentResult.cyclesProcessed} cycles processed`,
        );

        if (
          enrollmentResult.cyclesProcessed ===
          MAX_CYCLES_PER_ENROLLMENT_PER_RUN
        ) {
          console.warn(
            `[billing] Enrollment ${enrollment.id} reached the catch-up limit. Remaining due cycles will be handled on a later run.`,
          );
        }
      } catch (error) {
        result.failedEnrollments++;

        console.error(
          `[billing] Failed enrollment ${enrollment.id}:`,
          error,
        );

        // Continue processing the other enrollments.
      }
    }

    console.log(
      "[billing] Finished:",
      JSON.stringify(result),
    );

    return result;
  };
