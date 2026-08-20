import { z, ZodError } from "zod";
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
      const validatedData = schema.parse(req[source]);

      Object.assign(req[source], validatedData);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.issues,
        });
      }

      next(error);
    }
  };
};
