import type { Response } from "express";
import type { AuthenticatedRequest } from "../../utils/extendedRequests";
import { asyncHandler } from "../../middleware/asyncHandler";
import { getStudents, createStudentProfile, updateStudentProfile, getStudentById } from "./student.service";
import { getStudentsSchema, createStudentSchema, studentIdParamSchema, updateStudentSchema } from "./validations";

export const getStudentsController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const validatedParams = getStudentsSchema.parse(req.query);

    const result = await getStudents(tutorId, validatedParams);
    
    return res.status(200).json(result);
  }
);

export const createStudentController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const validatedData = createStudentSchema.parse(req.body);

    const newStudent = await createStudentProfile(tutorId, validatedData);
    
    return res.status(201).json(newStudent);
  }
);

export const getStudentDetailController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { id } = studentIdParamSchema.parse(req.params);

    const student = await getStudentById(tutorId, id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.status(200).json(student);
  }
);

export const updateStudentController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { id } = studentIdParamSchema.parse(req.params);
    const data = updateStudentSchema.parse(req.body);

    const updatedStudent = await updateStudentProfile(tutorId, id, data);
    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.status(200).json(updatedStudent);
  }
);