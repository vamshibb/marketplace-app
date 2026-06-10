import { NextFunction, Request, Response, } from "express";

import { prisma } from "../prisma/client";
import { AuthRequest } from "../middleware/authMiddleware";
import { AppError } from "../errors/AppError";

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
      await prisma.product.create({
        data: {
          title,
          description,
          price,
          image,
          sellerId: req.user!.id,
        },
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
      await prisma.product.findMany({
        include: {
          seller: {
            select: {
              id: true,
              email: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

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
      await prisma.product.findUnique({
        where: {
          id: req.params.id,
        },

        include: {
          seller: {
            select: {
              email: true,
            },
          },
        },
      });

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
      await prisma.product.findUnique({
        where: {
          id: req.params.id,
        },
      });

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
      await prisma.product.update({
        where: {
          id: req.params.id,
        },
        data: {
          title,
          description,
          price,
          image,
        },
      });

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
      await prisma.product.findUnique({
        where: {
          id: req.params.id,
        },
      });

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

    await prisma.product.delete({
      where: {
        id: req.params.id,
      },
    });

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
