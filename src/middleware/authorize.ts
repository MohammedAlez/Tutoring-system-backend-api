import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../utils/extendedRequests";

export const requireActiveUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  next();
};