import { NextFunction, Request, Response, } from "express";

import { prisma } from "../prisma/client";
import { AuthRequest } from "../middleware/authMiddleware";
import { AppError } from "../errors/AppError";
import * as productService
  from "../services/productService";
import { successResponse } from "../utils/apiResponse";

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
      image,
    } = req.body;

    const product =
      await productService.createProduct({
        title,
        description,
        price,
        image,
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
      req.query.page
    ) || 1;

    const limit = Number(
      req.query.limit
    ) || 10;
    const search =
      req.query.search?.toString() || "";

    const {
      products,
      total,
    } =
      await productService.getAllProducts(
        page,
        limit,
        search
      );

    res.json({
      success: true,
      data: products,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total / limit
          ),
      },
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

    const {
      title,
      description,
      price,
      image,
    } = req.body;

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

function next(error: unknown) {
  throw new Error("Function not implemented.");
}
