import { z } from "zod";
import {
  Request,
  Response,
  NextFunction,
} from "express";

export const validate = (
  schema: z.ZodTypeAny
) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
      });
    }
  };
};