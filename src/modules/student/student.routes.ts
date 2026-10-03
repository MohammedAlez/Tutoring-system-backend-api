import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { getStudentsController, createStudentController, getStudentDetailController, updateStudentController } from "./student.controller";

export const studentRouter = Router();

// Apply authentication middleware
studentRouter.use(authenticate);

// Student Routes
studentRouter.route("/")
  .get(getStudentsController)
  .post(createStudentController);

  studentRouter.route("/:id")
  .get(getStudentDetailController)
  .patch(updateStudentController);

