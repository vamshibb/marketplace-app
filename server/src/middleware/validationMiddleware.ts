import { z } from "zod";
import {
  Request,
  Response,
  NextFunction,
} from "express";

type ValidationSource = "body" | "query" | "params";

export const validate = (
  schema: z.ZodTypeAny,
  source: ValidationSource = "body"
) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      schema.parse(req[source]);
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
      });
    }
  };
};
