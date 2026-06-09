import {
  Request,
  Response,
  NextFunction,
} from "express";

import { AppError } from "../errors/appError";

export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(error);

  if (error instanceof AppError) {
    return res.status(
      error.statusCode
    ).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message:
      "Internal Server Error",
  });
};