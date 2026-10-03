import type { Response } from "express";
import type { AuthenticatedRequest } from "../../utils/extendedRequests";
import { asyncHandler } from "../../middleware/asyncHandler";
import { getSessionById, getSessions, getSessionsByDate, saveBulkAttendance, updateSession } from "./session.service";
import { bulkAttendanceSchema, getSessionsQuerySchema, getSessionsSchema, updateSessionSchema } from "./validation";
import z from "zod";

export const getSessionsByDateController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { date } = getSessionsSchema.parse(req.query);

    const sessions = await getSessionsByDate(tutorId, date);
    
    return res.status(200).json({ data: sessions });
  }
);


const sessionIdParamSchema = z.object({
  sessionId: z.string(),
});

export const getSessionsController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const filters = getSessionsQuerySchema.parse(req.query);

    const sessions = await getSessions(tutorId, filters);

    return res.status(200).json({ success: true, data: sessions });
  }
);

export const getSessionByIdController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { sessionId } = sessionIdParamSchema.parse(req.params);

    const session = await getSessionById(tutorId, sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    return res.status(200).json({ success: true, data: session });
  }
);

export const updateSessionController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { sessionId } = sessionIdParamSchema.parse(req.params);
    const body = updateSessionSchema.parse(req.body);

    const updatedSession = await updateSession(tutorId, sessionId, body);

    if (!updatedSession) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    return res.status(200).json({ success: true, data: updatedSession });
  }
);

export const bulkAttendanceController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { sessionId } = sessionIdParamSchema.parse(req.params);
    const { attendance } = bulkAttendanceSchema.parse(req.body);

    try {
      const updatedSession = await saveBulkAttendance(tutorId, sessionId, attendance);
      return res.status(200).json({ success: true, data: updatedSession });
    } catch (error) {
      return res.status(404).json({ success: false, message: (error as Error).message });
    }
  }
);
