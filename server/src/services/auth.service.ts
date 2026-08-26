import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import * as authRepository from "../repositories/auth.repository";

interface AuthUser {
  id: string;
  email: string;
}

const generateToken = (
  userId: string
): string => {
  return jwt.sign(
    { userId },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const buildAuthResponse = (
  user: AuthUser
) => {
  return {
    token: generateToken(user.id),
    user: {
      id: user.id,
      email: user.email,
    },
  };
};

export const register = async (
  email: string,
  password: string
) => {
  const existingUser = await authRepository.findUserByEmail(email);

  if (existingUser) {
    throw new AppError("User already exists", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await authRepository.createUser({
    email,
    password: hashedPassword,
  });

  return buildAuthResponse(user);
};

export const login = async (
  email: string,
  password: string
) => {
  const user = await authRepository.findUserByEmail(email);

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const validPassword = await bcrypt.compare(
    password,
    user.password
  );

  if (!validPassword) {
    throw new AppError("Invalid credentials", 401);
  }

  return buildAuthResponse(user);
};

export const getCurrentUser = async (
  userId: string
) => {
  const user = await authRepository.findUserById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};
