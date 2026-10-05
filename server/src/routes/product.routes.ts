import * as availabilityBlocks from "../controllers/availabilityBlock.controller";
import { createAvailabilityBlockSchema, availabilityBlockParamsSchema } from "../validators/availabilityBlock.validator";
import { Router } from "express";

import {
  createProduct,
  getProducts,
  getMyProducts,
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
import { rejectLegacyReviewCreation, getProductReviews } from "../controllers/review.controller";
import { upload } from "../middleware/upload.middleware";
import {
  productIdParamSchema,
} from "../validators/commonValidators";
import { getProductAvailability } from "../controllers/availability.controller";
import { availabilityQuerySchema } from "../validators/availability.validator";

const router = Router();

router.post("/:productId/availability-blocks", authMiddleware,
  validate(productIdParamSchema, "params"), validate(createAvailabilityBlockSchema), availabilityBlocks.createBlock);
router.get("/:productId/availability-blocks", authMiddleware,
  validate(productIdParamSchema, "params"), availabilityBlocks.getBlocks);
router.delete("/:productId/availability-blocks/:blockId", authMiddleware,
  validate(availabilityBlockParamsSchema, "params"), availabilityBlocks.deleteBlock);


router.get("/:productId/availability",
  validate(productIdParamSchema, "params"),
  validate(availabilityQuerySchema, "query"),
  getProductAvailability,
);

router.get(
  "/mine",
  authMiddleware,
  validate(getProductsQuerySchema, "query"),
  getMyProducts
);

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
  rejectLegacyReviewCreation
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
