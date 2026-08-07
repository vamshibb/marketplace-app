import {
  Request,
  Response,
  NextFunction,
} from "express";

import { uploadImage } from "../services/storage.service";
import { successResponse } from "../utils/apiResponse";
import { AppError } from "../errors/AppError";

export const uploadProductImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      throw new AppError(
        "Image is required",
        400
      );
    }

    const imageUrl =
      await uploadImage(req.file);

    res.status(201).json(
      successResponse(
        {
          imageUrl,
        },
        "Image uploaded successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};