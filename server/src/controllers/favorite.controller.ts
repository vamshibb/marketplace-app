import {
  Response,
  NextFunction,
} from "express";

import { AuthRequest }
  from "../middleware/authMiddleware";

import * as favoriteService
  from "../services/favorite.service";

import { successResponse }
  from "../utils/apiResponse";

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
  } catch (error) {
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