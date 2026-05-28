import { Request, Response } from "express";

import { prisma } from "../prisma/client";

interface AuthRequest extends Request {
  userId?: string;
}

export const createProduct = async (
  req: AuthRequest,
  res: Response
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
          price: Number(price),
          image,
          sellerId: req.userId!,
        },
      });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
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
  res: Response
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
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};