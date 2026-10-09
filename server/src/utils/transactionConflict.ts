import { Prisma } from "../generated/prisma";

// adapter-pg may expose a serialization failure at COMMIT directly, instead
// of wrapping it as P2034. Preserve the existing retry/409 handling for both.
export const normalizeTransactionConflict = (error: unknown): unknown => {
  if (error instanceof Error && error.name === "DriverAdapterError" && "cause" in error &&
      typeof error.cause === "object" && error.cause !== null && "kind" in error.cause &&
      error.cause.kind === "TransactionWriteConflict") {
    return new Prisma.PrismaClientKnownRequestError(error.message, {
      code: "P2034", clientVersion: Prisma.prismaVersion.client,
    });
  }
  return error;
};
