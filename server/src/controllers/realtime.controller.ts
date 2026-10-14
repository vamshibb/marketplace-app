import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { openUserRealtimeStream } from "../services/realtimeStream.service";

export const streamUserEvents = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    openUserRealtimeStream(req.user?.id, res);
  } catch (error) {
    next(error);
  }
};
