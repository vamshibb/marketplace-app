import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import * as service from "../services/availabilityBlock.service";
import { successResponse } from "../utils/apiResponse";

export const createBlock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(successResponse(await service.createBlock(req.params.productId, req.user!.id, req.body)));
  } catch (error) { next(error); }
};
export const getBlocks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(successResponse(await service.getBlocks(req.params.productId, req.user!.id)));
  } catch (error) { next(error); }
};
export const deleteBlock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await service.deleteBlock(req.params.productId, req.params.blockId, req.user!.id);
    res.json(successResponse(null, "Availability block deleted"));
  } catch (error) { next(error); }
};
