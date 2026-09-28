import { Router } from "express";

import {
  updateReview,
  deleteReview,
} from "../controllers/userReview.controller";

import {
  authMiddleware,
} from "../middleware/authMiddleware";
import { validate } from "../middleware/validationMiddleware";
import { reviewIdParamSchema } from "../validators/commonValidators";

import { updateReviewSchema } from "../validators/reviewValidators";

const router = Router();

router.put(
  "/:reviewId",
  authMiddleware,
  validate(reviewIdParamSchema, "params"),
  validate(updateReviewSchema),
  updateReview
);

router.delete(
  "/:reviewId",
  authMiddleware,
  validate(reviewIdParamSchema, "params"),
  deleteReview
);

export default router;
