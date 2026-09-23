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

export const validateProductMedia = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = req.files;
    if (!Array.isArray(files) || !files.length) {
      throw new AppError("At least one media file is required", 400);
    }
    if (files.length > MEDIA_LIMITS.MAX_FILES) {
      throw new AppError(`A maximum of ${MEDIA_LIMITS.MAX_FILES} media files is allowed`, 400);
    }

    // file-type is ESM; native import works with the existing NodeNext backend.
    const { fileTypeFromBuffer } = await import("file-type");
    // Validate the entire batch before the controller can start any Azure upload.
    for (const file of files) {
      let detected;
      try {
        detected = await fileTypeFromBuffer(file.buffer);
      } catch {
        throw new AppError("Unsupported or invalid media file", 400);
      }
      if (!detected || (!isImage(detected.mime) && !isVideo(detected.mime))) {
        throw new AppError("Unsupported media type", 400);
      }
      if (isImage(detected.mime) && file.size > MEDIA_LIMITS.MAX_IMAGE_SIZE) {
        throw new AppError("Image size exceeds the 10 MB limit", 400);
      }
      if (isVideo(detected.mime) && file.size > MEDIA_LIMITS.MAX_VIDEO_SIZE) {
        throw new AppError("Video size exceeds the 100 MB limit", 400);
      }

      // Use the detected MIME for IMAGE/VIDEO classification and Azure headers.
      file.mimetype = detected.mime;
    }
    next();
  } catch (error) {
    next(error);
  }
};
