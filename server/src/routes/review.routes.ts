import { Router } from "express";

import {
  updateReview,
  deleteReview,
} from "../controllers/review.controller";

import {
  authMiddleware,
} from "../middleware/authMiddleware";
import { validate } from "../middleware/validationMiddleware";
import { reviewIdParamSchema } from "../validators/commonValidators";

const router = Router();

router.put(
  "/:reviewId",
  authMiddleware,
  validate(reviewIdParamSchema, "params"),
  updateReview
);

router.delete(
  "/:reviewId",
  authMiddleware,
  validate(reviewIdParamSchema, "params"),
  deleteReview
);

export default router;
