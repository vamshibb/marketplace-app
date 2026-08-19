import { Router } from "express";

import {
  createProduct,
  getProducts,
  getProductById,
  deleteProduct,
  updateProduct,
} from "../controllers/product.controller";

import {
  authMiddleware,
} from "../middleware/authMiddleware";

import {
  validate,
  validateQuery,
} from "../middleware/validationMiddleware";

import {
  createProductSchema,
  getProductsQuerySchema,
  updateProductSchema,
} from "../validators/productValidators";
import { createReview, getProductReviews } from "../controllers/review.controller";
import { upload } from "../middleware/upload.middleware";
const router = Router();

router.get(
  "/",
  validateQuery(getProductsQuerySchema),
  getProducts
);
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
  upload.single("image"),
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