import { Router } from "express";

import {
  addFavorite,
  removeFavorite,
  getFavorites,
} from "../controllers/favorite.controller";

import { authMiddleware }
  from "../middleware/authMiddleware";
import { validate } from "../middleware/validationMiddleware";
import { productIdParamSchema } from "../validators/commonValidators";

const router = Router();

router.use(authMiddleware);

router.get("/", getFavorites);

router.post(
  "/:productId",
  validate(productIdParamSchema, "params"),
  addFavorite
);

router.delete(
  "/:productId",
  validate(productIdParamSchema, "params"),
  removeFavorite
);

export default router;
