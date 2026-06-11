import {
  Request,
  Response,
  NextFunction,
} from "express";

import * as categoryService
  from "../services/categoryService";

import { AppError }
  from "../errors/AppError";

import {
  createCategorySchema,
  updateCategorySchema,
} from "../validators/categoryValidators";

import { successResponse }
  from "../utils/apiResponse";

export const getCategories =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const categories =
        await categoryService.getAllCategories();

      res.json(
        successResponse(categories)
      );
    } catch (error) {
      next(error);
    }
  };

export const getCategoryById =
  async (
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
        throw new AppError(
          "Category not found",
          404
        );
      }

      res.json(
        successResponse(category)
      );
    } catch (error) {
      next(error);
    }
  };

export const createCategory =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const validatedData =
        createCategorySchema.parse(
          req.body
        );

      const category =
        await categoryService.createCategory(
          validatedData
        );

      res.status(201).json(
        successResponse(
          category,
          "Category created successfully"
        )
      );
    } catch (error) {
      next(error);
    }
  };

export const updateCategory =
  async (
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
        throw new AppError(
          "Category not found",
          404
        );
      }

      const validatedData =
        updateCategorySchema.parse(
          req.body
        );

      const updatedCategory =
        await categoryService.updateCategory(
          req.params.id,
          validatedData
        );

      res.json(
        successResponse(
          updatedCategory,
          "Category updated successfully"
        )
      );
    } catch (error) {
      next(error);
    }
  };

export const deleteCategory =
  async (
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
        throw new AppError(
          "Category not found",
          404
        );
      }

      await categoryService.deleteCategory(
        req.params.id
      );

      res.json(
        successResponse(
          null,
          "Category deleted successfully"
        )
      );
    } catch (error) {
      next(error);
    }
  };