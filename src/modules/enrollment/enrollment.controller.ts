
import type { Response } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { AuthenticatedRequest } from "../../utils/extendedRequests";
import { endEnrollmentSchema, enrollmentIdParamSchema, updateEnrollmentBillingSchema } from './validations';
import { endEnrollment, getEnrollmentBilling, updateEnrollmentBilling } from "./enrolments.service";

export const getEnrollmentBillingController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;
    const { id } = enrollmentIdParamSchema.parse(req.params);

    const billing = await getEnrollmentBilling(tutorId, id);

    return res.status(200).json({
      success: true,
      data: billing,
    });
  },
);


export const updateEnrollmentBillingController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;

    const { id } = enrollmentIdParamSchema.parse(req.params);

    const input = updateEnrollmentBillingSchema.parse(req.body);

    const enrollment = await updateEnrollmentBilling(
      tutorId,
      id,
      input,
    );

    return res.status(200).json({
      success: true,
      data: {
        enrollment,
      },
    });
  },
);


export const endEnrollmentController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tutorId = req.user!.userId;

    const { id } = enrollmentIdParamSchema.parse(req.params);

    const input = endEnrollmentSchema.parse(req.body ?? {});

    const enrollment = await endEnrollment(tutorId, id, input);

    return res.status(200).json({
      success: true,
      data: {
        enrollment,
      },
    });
  },
);