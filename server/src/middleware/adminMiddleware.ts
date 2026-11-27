import type { NextFunction, Response } from "express";

import { AppError } from "../errors/AppError";
import { UserRole } from "../generated/prisma";
import * as authRepository from "../repositories/auth.repository";
import type { AuthRequest } from "./authMiddleware";

export const adminMiddleware = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user?.id) {
            throw new AppError("Unauthorized", 401);
        }

        const user = await authRepository.findUserById(req.user.id);

        if (!user) {
            throw new AppError("Unauthorized", 401);
        }

        if (user.role !== UserRole.ADMIN) {
            throw new AppError("Forbidden", 403);
        }

        next();
    } catch (error) {
        next(error);
    }
};
