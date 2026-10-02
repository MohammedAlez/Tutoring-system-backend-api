import type { Request } from "express";
import type { AccessTokenPayload } from "../types/auth";


export interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayload;
}