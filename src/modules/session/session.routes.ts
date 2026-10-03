import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { bulkAttendanceController, getSessionByIdController, getSessionsController, updateSessionController } from "./session.controller";
 // Adjust import paths based on your folder structure

export const sessionRouter = Router();

// Apply authentication middleware to all routes in this router
sessionRouter.use(authenticate);

sessionRouter.get("/", getSessionsController);
sessionRouter.get("/:sessionId", getSessionByIdController);
sessionRouter.patch("/:sessionId", updateSessionController);
sessionRouter.post("/:sessionId/attendance", bulkAttendanceController);

