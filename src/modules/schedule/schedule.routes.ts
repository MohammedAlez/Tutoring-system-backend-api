import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { getTutorSchedulesController } from "./schedule.controller";

export const scheduleRouter = Router();
scheduleRouter.use(authenticate);

scheduleRouter.get("/", getTutorSchedulesController);

