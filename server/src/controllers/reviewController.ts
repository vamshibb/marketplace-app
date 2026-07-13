import {
  Response,
  NextFunction,
} from "express";

import { AuthRequest }
  from "../middleware/authMiddleware";

import * as reviewService
  from "../services/reviewService";

import {
  createReviewSchema,
  updateReviewSchema,
} from "../validators/reviewValidators";

import { successResponse }
  from "../utils/apiResponse";

import { AppError }
  from "../errors/AppError";
import * as productService from "../services/productService";

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
      const product =
        await productService.findProductById(
          req.params.productId
        );

      if (!product) {
        throw new AppError(
          "Product not found",
          404
        );
      }

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
      const review =
        await reviewService.getReviewById(
          req.params.reviewId
        );

      if (!review) {
        throw new AppError(
          "Review not found",
          404
        );
      }

      if (
        review.userId !== req.user?.id
      ) {
        throw new AppError(
          "Not authorized",
          403
        );
      }

      const validatedData =
        updateReviewSchema.parse(
          req.body
        );

      const updatedReview =
        await reviewService.updateReview(
          req.params.reviewId,
          validatedData
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
      const review =
        await reviewService.getReviewById(
          req.params.reviewId
        );

      if (!review) {
        throw new AppError(
          "Review not found",
          404
        );
      }

      if (
        review.userId !== req.user?.id
      ) {
        throw new AppError(
          "Not authorized",
          403
        );
      }

      await reviewService.deleteReview(
        req.params.reviewId
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