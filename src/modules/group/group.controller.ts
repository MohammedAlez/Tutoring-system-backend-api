import type { Response } from "express";
import type { AuthenticatedRequest } from "../../utils/extendedRequests";
import { asyncHandler } from "../../middleware/asyncHandler";
import {
  createGroup,
  enrollStudentInGroup,
  getGroupsList,
  unenrollStudentFromGroup,
  updateGroup,
} from "./group.service";
import {
  createGroupSchema,
  enrollStudentSchema,
  getGroupsSchema,
  groupIdParamSchema,
  unenrollStudentParamsSchema,
  updateGroupSchema,
} from "./validations";

export const getGroupsController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const filters = getGroupsSchema.parse(req.query);

    const groups = await getGroupsList(tutorId, filters);

    return res.status(200).json({ success: true, data: groups });
  }
);

export const createGroupController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const body = createGroupSchema.parse(req.body);

    const group = await createGroup(tutorId, body);

    return res.status(201).json({ success: true, data: group });
  }
);

export const updateGroupController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { groupId } = groupIdParamSchema.parse(req.params);
    const body = updateGroupSchema.parse(req.body);

    const updatedGroup = await updateGroup(tutorId, groupId, body);

    if (!updatedGroup) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    return res.status(200).json({ success: true, data: updatedGroup });
  }
);

export const enrollStudentController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { groupId } = groupIdParamSchema.parse(req.params);
    const { studentId } = enrollStudentSchema.parse(req.body);

    try {
      const enrollment = await enrollStudentInGroup(tutorId, groupId, studentId);
      return res.status(201).json({ success: true, data: enrollment });
    } catch (error) {
      return res.status(404).json({ success: false, message: (error as Error).message });
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
      return res.status(404).json({ success: false, message: (error as Error).message });
    }
  }
);