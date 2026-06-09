import { NextFunction, Request, Response, } from "express";

import { prisma } from "../prisma/client";
import { AuthRequest } from "../middleware/authMiddleware";
import { AppError } from "../errors/appError";

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
  res: Response
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
    res.status(500).json({
      message: "Server error",
    });
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

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (
      product.sellerId !==
      req.user?.id
    ) {
      return res.status(403).json({
        message: "Not authorized",
      });
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
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const deleteProduct = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const product =
      await prisma.product.findUnique({
        where: {
          id: req.params.id,
        },
      });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (
      product.sellerId !==
      req.user?.id
    ) {
      return res.status(403).json({
        message: "Not authorized",
      });
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
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

function next(error: unknown) {
  throw new Error("Function not implemented.");
}
