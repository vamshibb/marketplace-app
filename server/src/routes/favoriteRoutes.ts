import { Router } from "express";

import {
  addFavorite,
  removeFavorite,
  getFavorites,
} from "../controllers/favoriteController";

import { authMiddleware }
  from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getFavorites);

router.post(
  "/:productId",
  addFavorite
);

router.delete(
  "/:productId",
  removeFavorite
);

export default router;