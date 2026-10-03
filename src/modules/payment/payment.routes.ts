import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { getPaymentsController } from "./payment.controller";
 // Adjust import paths based on your folder structure

export const paymentRouter = Router();

// Apply authentication middleware to all routes in this router
paymentRouter.use(authenticate);

paymentRouter.get("/", getPaymentsController);

