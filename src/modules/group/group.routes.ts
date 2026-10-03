import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { enrollStudentController, unenrollStudentController } from "./group.controller";

export const groupRouter = Router();

// Apply authentication middleware
groupRouter.use(authenticate);

groupRouter.post("/:groupId/students", enrollStudentController);
groupRouter.delete("/:groupId/students/:studentId", unenrollStudentController);



