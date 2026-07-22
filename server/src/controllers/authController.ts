import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { prisma } from "../prisma/client";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  successResponse,
} from "../utils/apiResponse";

export const register = async (
  req: Request,
  res: Response
) => {
  try {
    const { email, password } = req.body;

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "7d",
      }
    );

    return res.status(201).json(
      successResponse(
        {
          token,
          user: {
            id: user.id,
            email: user.email,
          },
        },
        "Registration successful"
      )
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
      error:
        (error as any)?.message ||
        String(error),
    });
  }
};

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const { email, password } = req.body;

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const validPassword =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!validPassword) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "7d",
      }
    );

    return res.json(
      successResponse(
        {
          token,
          user: {
            id: user.id,
            email: user.email,
          },
        },
        "Login successful"
      )
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
      error:
        (error as any)?.message ||
        String(error),
    });
  }
};

export const me = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: req.user.id,
        },
        select: {
          id: true,
          email: true,
        },
      });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json(
      successResponse(
        user,
        "User retrieved successfully"
      )
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};