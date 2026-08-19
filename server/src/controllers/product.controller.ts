import { NextFunction, Request, Response, } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { AppError } from "../errors/AppError";
import * as productService
  from "../services/product.service";
import { successResponse } from "../utils/apiResponse";
import { buildPagination } from "../utils/pagination";
import "multer";
import * as categoryService from "../services/category.service";

export const createProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {

  try {
    const {
      title,
      description,
      price,
      categoryId,
    } = req.body;

    if (categoryId) {
      const exists =
        await categoryService.categoryExists(
          categoryId
        );

      if (!exists) {
        throw new AppError(
          "Category not found",
          400
        );
      }
    }


    const product =
      await productService.createProduct({
      title,
      description,
      price: Number(price),
      categoryId,
      sellerId: req.user!.id,
      });

    return res
      .status(201)
      .json(
        successResponse(
          product,
          "Product created successfully"
        )
      );
  } catch (error) {

    next(error);
  }
};

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(
      req.query.page ?? 1
    );

    const limit = Number(
      req.query.limit ?? 10
    );
    const search =
      req.query.search?.toString().trim();
    const categoryId =
      req.query.categoryId?.toString().trim();
    const minPrice = req.query.minPrice !== undefined
      ? Number(req.query.minPrice)
      : undefined;
    const maxPrice = req.query.maxPrice !== undefined
      ? Number(req.query.maxPrice)
      : undefined;
    const sort = req.query.sort?.toString();

    const filters = {
      page,
      limit,
      search,
      categoryId,
      minPrice,
      maxPrice,
      sort,
    };

    const {
      products,
      total,
    } =
      await productService.getAllProducts(
        filters
      );

    res.json({
      success: true,
      data: products,
      pagination: buildPagination(
        page,
        limit,
        total
      ),
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product =
      await productService.findProductById(
        req.params.id
      );
    if (!product) {
      throw new AppError(
        "Product not found",
        404
      );
    }

    res.json(successResponse(product));
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const product =
      await productService.findProductById(
        req.params.id
      );

    if (!product) throw new AppError(
      "Product not found",
      404
    );


    if (
      product.sellerId !==
      req.user?.id
    ) {
      throw new AppError(
        "Not authorized",
        403
      );
    }

    const updatedProduct =
      await productService.updateProduct(
        req.params.id,
        req.body
      );

    res.json(
      successResponse(
        updatedProduct,
        "Product updated successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const product =
      await productService.findProductById(
        req.params.id
      );

    if (!product) {
      throw new AppError(
        "Product not found",
        404
      );
    }

    if (
      product.sellerId !== req.user?.id
    ) {
      throw new AppError(
        "Not authorized",
        403
      );
    }

    await productService.deleteProduct(
      req.params.id
    );

    res.json(
      successResponse(
        null,
        "Product deleted successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};


