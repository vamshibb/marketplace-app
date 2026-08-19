import {
  NextFunction,
  Request,
  Response,
} from "express";

import { AuthRequest } from "../middleware/authMiddleware";
import * as authService from "../services/auth.service";
import { successResponse } from "../utils/apiResponse";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    const result = await authService.register(email, password);

    return res.status(201).json(
      successResponse(
        result,
        "Registration successful"
      )
    );
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    return res.json(
      successResponse(
        result,
        "Login successful"
      )
    );
  } catch (error) {
    next(error);
  }
};

export const me = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await authService.getCurrentUser(
      req.user!.id
    );

    return res.json(
      successResponse(
        user,
        "User retrieved successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};
