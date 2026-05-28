import { Router } from "express";

import {
  createProduct,
  getProducts,
  getProductById,
} from "../controllers/productController";

import {
  authMiddleware,
} from "../middleware/authMiddleware";

const router = Router();

router.get("/", getProducts);

router.get("/:id", getProductById);

router.post(
  "/",
  authMiddleware,
  createProduct
);

export default router;