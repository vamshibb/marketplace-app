import { Router } from "express";

import {
  updateReview,
  deleteReview,
} from "../controllers/reviewController";

import {
  authMiddleware,
} from "../middleware/authMiddleware";

const router = Router();

router.put(
  "/:reviewId",
  authMiddleware,
  updateReview
);

router.delete(
  "/:reviewId",
  authMiddleware,
  deleteReview
);

export default router;