import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import {
  createGroupController,
  enrollStudentController,
  getGroupsController,
  unenrollStudentController,
  updateGroupController,
  addGroupScheduleController,
  getGroupAttendanceStatsController,
  deleteGroupScheduleController,
  getGroupDetailsController
} from "./group.controller";

export const groupRouter = Router();
groupRouter.use(authenticate);

groupRouter.get("/", getGroupsController);
groupRouter.post("/", createGroupController);
groupRouter.get("/:groupId", getGroupDetailsController);
groupRouter.patch("/:groupId", updateGroupController);

groupRouter.post("/:groupId/students", enrollStudentController);
groupRouter.delete("/:groupId/students/:studentId", unenrollStudentController);


// Group Recurring Schedules
groupRouter.post("/:groupId/schedules", addGroupScheduleController);
groupRouter.delete("/:groupId/schedules/:scheduleId", deleteGroupScheduleController);

// Group Attendance Matrix Stats
groupRouter.get("/:groupId/attendance-stats", getGroupAttendanceStatsController);
