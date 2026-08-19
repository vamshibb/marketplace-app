import { Router } from "express";
import * as categoryController from "../controllers/category.controller";
import { validate } from "../middleware/validationMiddleware";
import { categoryIdParamSchema } from "../validators/commonValidators";

const router = Router();

router.get("/", categoryController.getAllCategories);

router.get(
  "/tree",
  categoryController.getCategoryTree
);

router.get("/slug/:slug", categoryController.getCategoryBySlug);

router.get(
  "/:id",
  validate(categoryIdParamSchema, "params"),
  categoryController.getCategoryById
);

export default router;
