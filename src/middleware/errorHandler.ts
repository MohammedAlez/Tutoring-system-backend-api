import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';

export const errorMiddleware = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1. Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: error.flatten().fieldErrors,
    });
  }

  // 2. Known operational errors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }

  // 3. Unexpected errors
  console.error('Unhandled error:', error);

  return res.status(500).json({
    message: 'Internal server error. Please try again later.',
  });
};