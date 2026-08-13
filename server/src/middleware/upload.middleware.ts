import multer from "multer";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MEDIA_LIMITS,
} from "../constants/media.constants";
import { AppError } from "../errors/AppError";

const allowedMimeTypes = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
];

export const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MEDIA_LIMITS.MAX_VIDEO_SIZE,
    files: MEDIA_LIMITS.MAX_FILES,
  },

  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(
      new AppError(
        "Only JPEG, PNG, WebP, MP4, MOV and WebM files are allowed.",
        400
      )
    );
  },
});