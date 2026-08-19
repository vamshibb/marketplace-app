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

import { validate } from "../middleware/validationMiddleware";

import {
  createProductSchema,
  getProductsQuerySchema,
  updateProductSchema,
} from "../validators/productValidators";
import { createReview, getProductReviews } from "../controllers/review.controller";
import { upload } from "../middleware/upload.middleware";
import {
  productIdParamSchema,
} from "../validators/commonValidators";
const router = Router();

router.get(
  "/",
  validate(getProductsQuerySchema, "query"),
  getProducts
);
router.get(
  "/:productId/reviews",
  validate(productIdParamSchema, "params"),
  getProductReviews
);

router.post(
  "/:productId/reviews",
  authMiddleware,
  validate(productIdParamSchema, "params"),
  createReview
);
router.get(
  "/:id",
  validate(productIdParamSchema, "params"),
  getProductById
);

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
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema),
  updateProduct
);

router.delete(
  "/:id",
  authMiddleware,
  validate(productIdParamSchema, "params"),
  deleteProduct
);

export default router;
