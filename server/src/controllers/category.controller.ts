import {
    Request,
    Response,
    NextFunction,
} from "express";

import * as categoryService from "../services/category.service";
import { AppError } from "../errors/AppError";
import { successResponse } from "../utils/apiResponse";

export const getAllCategories = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const categories =
            await categoryService.getAllCategories();

        return res
            .status(200)
            .json(successResponse(categories));
    } catch (error) {
        next(error);
    }
};

export const getCategoryBySlug = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const category =
            await categoryService.getCategoryBySlug(
                req.params.slug
            );

        if (!category) {
            throw new AppError("Category not found", 404);
        }

        res.json(successResponse(category));
    } catch (error) {
        next(error);
    }
};

export const getCategoryById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const category =
            await categoryService.getCategoryById(
                req.params.id
            );

        if (!category) {
            throw new AppError("Category not found", 404);
        }

        res.json(successResponse(category));
    } catch (error) {
        next(error);
    }
};

export const getCategoryTree = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categoryTree =
      await categoryService.getCategoryTree();

    res.json(
      successResponse(categoryTree)
    );
  } catch (error) {
    next(error);
  }
};