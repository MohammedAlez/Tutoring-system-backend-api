import type { Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import type { AuthenticatedRequest } from "../utils/extendedRequests";

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      message: "Invalid authorization header",
    });
  }

  try {
    const payload = verifyAccessToken(token);

    // Attach decoded user payload ({ userId: string })
    req.user = payload;

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired access token",
    });
  }
};