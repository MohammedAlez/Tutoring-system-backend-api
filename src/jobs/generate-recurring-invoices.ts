
import { prisma } from "../lib/prisma";
import {
  generateRecurringInvoices,
} from "../services/billing/recurring-invoice.service";

const main = async () => {
  try {
    const result = await generateRecurringInvoices();

    // Exit with a failure code if any enrollments failed.
    if (result.failedEnrollments > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      "[billing] Recurring invoice job failed:",
      error,
    );

    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

void main();
