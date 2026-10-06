import type { Response } from "express";
import type { AuthenticatedRequest } from "../../utils/extendedRequests";
import { asyncHandler } from "../../middleware/asyncHandler";
import { getUserProfile, updateUserProfile } from "./user.service";
import { updateProfileSchema } from "./user.validation";

export const getProfileController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const user = await getUserProfile(userId);

    return res.status(200).json({
      success: true,
      data: user,
    });
  }
);

export const updateProfileController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const body = updateProfileSchema.parse(req.body);

    try {
      const updatedUser = await updateUserProfile(userId, body);

      return res.status(200).json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  }
);