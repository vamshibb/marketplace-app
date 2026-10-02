import type { Request, Response, NextFunction } from "express";
import { getProductAvailability as getAvailability } from "../services/availability.service";
import { availabilityQuerySchema } from "../validators/availability.validator";
import { successResponse } from "../utils/apiResponse";

export const getProductAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = availabilityQuerySchema.parse(req.query);
    const availability = await getAvailability(req.params.productId, query);
    res.json(successResponse(availability));
  } catch (error) {
    next(error);
  }
};
