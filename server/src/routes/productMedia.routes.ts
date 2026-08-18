import { Router } from "express";

import {
  deleteProductMedia,
  getProductMedia,
  reorderProductMedia,
  uploadMedia,
} from "../controllers/productMedia.controller";
import {
  MEDIA_FIELD_NAME,
  MEDIA_LIMITS,
} from "../constants/media.constants";
import { authMiddleware } from "../middleware/authMiddleware";
import { upload } from "../middleware/upload.middleware";
import { validate } from "../middleware/validationMiddleware";
import { reorderProductMediaSchema } from "../validators/productMedia.validator";

const router = Router();

router.get(
  "/:productId/media",
  getProductMedia
);

router.post(
  "/:productId/media",
  authMiddleware,
  upload.array(
    MEDIA_FIELD_NAME,
    MEDIA_LIMITS.MAX_FILES
  ),
  uploadMedia
);

router.delete(
  "/:productId/media/:mediaId",
  authMiddleware,
  deleteProductMedia
);

router.patch(
  "/:productId/media/order",
  authMiddleware,
  validate(reorderProductMediaSchema),
  reorderProductMedia
);

export default router;
