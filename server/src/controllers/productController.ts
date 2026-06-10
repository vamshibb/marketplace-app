import { NextFunction, Request, Response, } from "express";

import { prisma } from "../prisma/client";
import { AuthRequest } from "../middleware/authMiddleware";
import { AppError } from "../errors/AppError";
import * as productService
  from "../services/productService";

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
      .json(product);
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
    const products =
  await productService.getAllProducts();
    res.json(products);
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

    res.json(product);
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

    res.json(updatedProduct);
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

res.json({
  message:
    "Product deleted successfully",
});
  } catch (error) {
    next(error);
  }
};

function next(error: unknown) {
  throw new Error("Function not implemented.");
}
