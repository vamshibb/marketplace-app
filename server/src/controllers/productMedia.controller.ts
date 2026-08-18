import {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../errors/AppError";
import { AuthRequest } from "../middleware/authMiddleware";
import * as productMediaService from "../services/productMedia.service";
import { successResponse } from "../utils/apiResponse";

export const getProductMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const media = await productMediaService.getMediaByProductId(
      req.params.productId
    );

    res.json(successResponse(media));
  } catch (error) {
    next(error);
  }
};

export const uploadMedia = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const media = await productMediaService.uploadMedia(
      req.params.productId,
      req.files as Express.Multer.File[],
      userId
    );

    res.status(201).json(
      successResponse(
        media,
        "Product media uploaded successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

export const deleteProductMedia = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    await productMediaService.deleteMedia(
      req.params.productId,
      req.params.mediaId,
      userId
    );

    res.json(
      successResponse(
        undefined,
        "Product media deleted successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};
