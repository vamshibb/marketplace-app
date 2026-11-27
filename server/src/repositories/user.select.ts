import type { Prisma } from "../generated/prisma";

export const userSummarySelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
} satisfies Prisma.UserSelect;
