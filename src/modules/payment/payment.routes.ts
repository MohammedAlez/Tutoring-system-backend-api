import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import {
  createPaymentController,
  getPaymentsController,
  updatePaymentController,
} from "./payment.controller";
import { getPaymentsSummaryController } from "./payment-summary.controller";
import { getUpcomingPaymentsController } from "./payment-upcoming.controller";


export const paymentRouter = Router();

// Secure all payment routes with authentication middleware
paymentRouter.use(authenticate);

paymentRouter.get("/", getPaymentsController);
paymentRouter.post("/", createPaymentController);
paymentRouter.get("/summary", getPaymentsSummaryController);
paymentRouter.get("/upcoming", getUpcomingPaymentsController);

paymentRouter.patch("/:id", updatePaymentController);
