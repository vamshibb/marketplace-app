import {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MEDIA_LIMITS,
} from "../constants/media.constants";
import { AppError } from "../errors/AppError";

export const reorderProductMediaSchema = z.object({
mediaIds: z
  .array(z.string().min(1))
  .min(1)});

const isImage = (mimeType: string): boolean => {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
};

const isVideo = (mimeType: string): boolean => {
  return ALLOWED_VIDEO_TYPES.includes(mimeType);
};

export const validateProductMedia = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files?.length) {
    return next(new AppError("At least one media file is required", 400));
  }

  if (files.length > MEDIA_LIMITS.MAX_FILES) {
    return next(
      new AppError(
        `A maximum of ${MEDIA_LIMITS.MAX_FILES} media files is allowed`,
        400
      )
    );
  }

  for (const file of files) {
    if (!isImage(file.mimetype) && !isVideo(file.mimetype)) {
      return next(new AppError("Unsupported media type", 400));
    }

    if (isImage(file.mimetype) && file.size > MEDIA_LIMITS.MAX_IMAGE_SIZE) {
      return next(new AppError("Image size exceeds the 10 MB limit", 400));
    }

    if (isVideo(file.mimetype) && file.size > MEDIA_LIMITS.MAX_VIDEO_SIZE) {
      return next(new AppError("Video size exceeds the 100 MB limit", 400));
    }
  }

  next();
};
