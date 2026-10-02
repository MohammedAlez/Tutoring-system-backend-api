import type { Request, Response } from "express";
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerTutorSchema,
} from "./auth.validation";
import {
  changePassword,
  getCurrentUser,
  login,
  logout,
  refreshAccessToken,
  registerTutor,
} from "./auth.service";
import type { AuthenticatedRequest } from "../../utils/extendedRequests";
import { asyncHandler } from "../../middleware/asyncHandler";

export const registerTutorController = asyncHandler(
  async (req: Request, res: Response) => {
    const data = registerTutorSchema.parse(req.body);

    const result = await registerTutor(data);

    return res.status(201).json({
      message: "Tutor registered successfully",
      data: result,
    });
  }
);

export const loginController = asyncHandler(
  async (req: Request, res: Response) => {
    const data = loginSchema.parse(req.body);

    const result = await login(data);

    return res.status(200).json({
      message: "Login successful",
      data: result,
    });
  }
);

export const refreshTokenController = asyncHandler(
  async (req: Request, res: Response) => {
    const data = refreshTokenSchema.parse(req.body);

    const result = await refreshAccessToken(data);

    return res.status(200).json({
      message: "Token refreshed successfully",
      data: result,
    });
  }
);

export const meController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await getCurrentUser(req.user!.userId);

    return res.status(200).json({
      data: user,
    });
  }
);

export const logoutController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { refreshToken } = logoutSchema.parse(req.body);

    const userId = req.user!.userId;

    await logout(userId, refreshToken);

    return res.status(204).send();
  }
);

export const changePasswordController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const userId = req.user!.userId;

    await changePassword(userId, currentPassword, newPassword);

    return res.status(200).json({
      message: "Password changed successfully",
    });
  }
);