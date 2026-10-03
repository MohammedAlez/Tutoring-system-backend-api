import type { Response } from "express";
import type { AuthenticatedRequest } from "../../utils/extendedRequests";
import { asyncHandler } from "../../middleware/asyncHandler";
import { enrollStudentInGroup, unenrollStudentFromGroup } from "./group.service";
import { enrollStudentSchema, groupIdParamSchema, unenrollStudentParamsSchema } from "./validations";

export const enrollStudentController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { groupId } = groupIdParamSchema.parse(req.params);
    const { studentId } = enrollStudentSchema.parse(req.body);

    try {
      const enrollment = await enrollStudentInGroup(tutorId, groupId, studentId);
      return res.status(201).json(enrollment);
    } catch (error) {
      return res.status(404).json({ message: (error as Error).message });
    }
  }
);

export const unenrollStudentController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { groupId, studentId } = unenrollStudentParamsSchema.parse(req.params);

    try {
      await unenrollStudentFromGroup(tutorId, groupId, studentId);
      return res.status(200).json({ success: true, message: "Student successfully removed from group." });
    } catch (error) {
      return res.status(404).json({ message: (error as Error).message });
    }
  }
);