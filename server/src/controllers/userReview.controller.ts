import {
  Response,
  NextFunction,
} from "express";

import { AuthRequest }
  from "../middleware/authMiddleware";

import * as reviewService
  from "../services/userReview.service";

import {
  createReviewSchema,
  updateReviewSchema,
} from "../validators/reviewValidators";

import { successResponse }
  from "../utils/apiResponse";



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
      await reviewService.createUserReview(
        req.user!.id,
        req.params.orderId,
        rating,
        comment
      );

    res.status(201).json(
      successResponse(
        review,
        "Review created successfully"
      )
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
        await reviewService.updateUserReview(
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
      await reviewService.deleteUserReview(
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

