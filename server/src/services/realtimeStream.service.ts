import type { Response } from "express";
import { AppError } from "../errors/AppError";
import { userRealtimePublisher } from "../utils/userRealtimePublisher";

export const openUserRealtimeStream = (userId: string | undefined, response: Response): void => {
  if (typeof userId !== "string" || !userId.trim()) throw new AppError("Unauthorized", 401);
  userRealtimePublisher.subscribe(userId, response);
};
