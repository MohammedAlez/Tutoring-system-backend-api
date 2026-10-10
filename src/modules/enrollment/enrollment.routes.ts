import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { endEnrollmentController, getEnrollmentBillingController, updateEnrollmentBillingController } from "./enrollment.controller";



export const enrollmentRouter = Router();
enrollmentRouter.use(authenticate);


enrollmentRouter.get("/:id/billing", getEnrollmentBillingController);
enrollmentRouter.patch("/:id/billing",  updateEnrollmentBillingController);
enrollmentRouter.patch("/:id", endEnrollmentController);