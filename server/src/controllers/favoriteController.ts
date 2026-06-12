import {
  Response,
  NextFunction,
} from "express";

import { AuthRequest }
  from "../middleware/authMiddleware";

import * as favoriteService
  from "../services/favoriteService";

import { successResponse }
  from "../utils/apiResponse";
import { AppError } from "../errors/AppError";

export const addFavorite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const favorite =
      await favoriteService.addFavorite(
        req.user!.id,
        req.params.productId
      );

    res.status(201).json(
      successResponse(
        favorite,
        "Added to favorites"
      )
    );
  } catch (error: any) {
  if (error.code === "P2002") {
    return next(
      new AppError(
        "Product already in favorites",
        409
      )
    );
  }

  next(error);
}
};

export const removeFavorite =
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await favoriteService.removeFavorite(
        req.user!.id,
        req.params.productId
      );

      res.json(
        successResponse(
          null,
          "Removed from favorites"
        )
      );
    } catch (error) {
      next(error);
    }
  };

export const getFavorites =
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const favorites =
        await favoriteService.getFavorites(
          req.user!.id
        );

      res.json(
        successResponse(favorites)
      );
    } catch (error) {
      next(error);
    }
  };