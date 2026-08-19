import { Prisma } from "../generated/prisma";
import { prisma } from "../prisma/client";

export const findUserByEmail = (
  email: string
) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

export const findUserById = (
  id: string
) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
    },
  });
};

export const createUser = (
  data: Prisma.UserCreateInput
) => {
  return prisma.user.create({
    data,
  });
};
