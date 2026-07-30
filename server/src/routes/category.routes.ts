import { Router } from "express";
import * as categoryController from "../controllers/category.controller";

const router = Router();

router.get("/", categoryController.getAllCategories);

router.get("/slug/:slug", categoryController.getCategoryBySlug);

router.get("/:id", categoryController.getCategoryById);

export default router;
