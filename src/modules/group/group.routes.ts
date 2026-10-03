import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import {
  createGroupController,
  enrollStudentController,
  getGroupsController,
  unenrollStudentController,
  updateGroupController,
} from "./group.controller";

export const groupRouter = Router();
groupRouter.use(authenticate);

groupRouter.get("/", getGroupsController);
groupRouter.post("/", createGroupController);
groupRouter.patch("/:groupId", updateGroupController);

groupRouter.post("/:groupId/students", enrollStudentController);
groupRouter.delete("/:groupId/students/:studentId", unenrollStudentController);

