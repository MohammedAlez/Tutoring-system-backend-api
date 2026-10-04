// import { Router } from "express";
// import { authenticate } from "../../middleware/authenticate";
// import { getPaymentsController, updatePaymentController } from "./payment.controller";
//  // Adjust import paths based on your folder structure

// export const paymentRouter = Router();

// // Apply authentication middleware to all routes in this router
// paymentRouter.use(authenticate);

// paymentRouter.get("/", getPaymentsController);
// paymentRouter.patch("/:id", updatePaymentController);
// // 

import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import {
  createPaymentController,
  getPaymentsController,
  updatePaymentController,
} from "./payment.controller";

export const paymentRouter = Router();

// Secure all payment routes with authentication middleware
paymentRouter.use(authenticate);

paymentRouter.get("/", getPaymentsController);
paymentRouter.post("/", createPaymentController);
paymentRouter.patch("/:id", updatePaymentController);

