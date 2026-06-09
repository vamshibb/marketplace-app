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

const router = Router();

router.get("/", getProducts);

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