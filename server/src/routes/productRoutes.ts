import { Router } from "express";

import {
  createProduct,
  getProducts,
  getProductById,
  deleteProduct,
  updateProduct,
} from "../controllers/productController";

import {
  authMiddleware,
} from "../middleware/authMiddleware";

import { validate } from "../middleware/validationMiddleware";

import {
  createProductSchema,
  updateProductSchema,
} from "../validators/productValidators";
import { createReview, getProductReviews } from "../controllers/reviewController";

const router = Router();

router.get("/", getProducts);
router.get(
  "/:productId/reviews",
  getProductReviews
);

router.post(
  "/:productId/reviews",
  authMiddleware,
  createReview
);
router.get("/:id", getProductById);

router.post(
  "/",
  authMiddleware,
  validate(createProductSchema),
  createProduct
);

router.put(
  "/:id",
  authMiddleware,
  validate(updateProductSchema),
  updateProduct
);

router.delete(
  "/:id",
  authMiddleware,
  deleteProduct
);

export default router;