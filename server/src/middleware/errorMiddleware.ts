import {
  Request,
  Response,
  NextFunction,
} from "express";
import multer from "multer";

import { AppError } from "../errors/AppError";

export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          message: "File size exceeds the allowed limit.",
        });

      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          success: false,
          message: "Maximum 10 files can be uploaded.",
        });

      default:
        return res.status(400).json({
          success: false,
          message: error.message,
        });
    }
  }

  return res.status(500).json({
    success: false,
    message: error.message || "Internal Server Error",
  });
};