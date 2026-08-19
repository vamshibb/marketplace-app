import {
  Response,
  NextFunction,
} from "express";

import { AuthRequest }
  from "../middleware/authMiddleware";

import * as reviewService
  from "../services/review.service";

import {
  createReviewSchema,
  updateReviewSchema,
} from "../validators/reviewValidators";

import { successResponse }
  from "../utils/apiResponse";

import { AppError }
  from "../errors/AppError";

export const createReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      rating,
      comment,
    } = createReviewSchema.parse(
      req.body
    );

    const review =
      await reviewService.createReview(
        req.user!.id,
        req.params.productId,
        rating,
        comment
      );

    res.status(201).json(
      successResponse(
        review,
        "Review created successfully"
      )
    );
  } catch (error: any) {
    if (error.code === "P2002") {
      return next(
        new AppError(
          "You already reviewed this product",
          409
        )
      );
    }

    next(error);
  }
};

export const getProductReviews =
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const reviews =
        await reviewService.getProductReviews(
          req.params.productId
        );

      res.json(
        successResponse(reviews)
      );
    } catch (error) {
      next(error);
    }
  };

export const updateReview =
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const validatedData =
        updateReviewSchema.parse(
          req.body
        );

      const updatedReview =
        await reviewService.updateReview(
          req.params.reviewId,
          validatedData,
          req.user!.id
        );

      res.json(
        successResponse(
          updatedReview,
          "Review updated successfully"
        )
      );
    } catch (error) {
      next(error);
    }
  };

export const deleteReview =
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await reviewService.deleteReview(
        req.params.reviewId,
        req.user!.id
      );

      res.json(
        successResponse(
          null,
          "Review deleted successfully"
        )
      );
    } catch (error) {
      next(error);
    }
  };
