import {
    OrderStatus,
    Prisma,
    RentalDisputeResolution,
    RentalDisputeStatus,
} from "../generated/prisma";
import { prisma } from "../prisma/client";
import { normalizeTransactionConflict } from "../utils/transactionConflict";

export const rentalDisputeSelect = {
    id: true,
    orderId: true,
    openedById: true,
    reason: true,
    details: true,
    status: true,
    resolution: true,
    resolvedAt: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.RentalDisputeSelect;


export const createRentalDispute = (
    data: Prisma.RentalDisputeUncheckedCreateInput
) => {
    return prisma.rentalDispute.create({
        data,
        select: rentalDisputeSelect,
    });
};

export const findRentalDisputeByOrderId = (
    orderId: string
) => {
    return prisma.rentalDispute.findUnique({
        where: { orderId },
        select: rentalDisputeSelect,
    });
};

export const findRentalDisputeById = (
    id: string
) => {
    return prisma.rentalDispute.findUnique({
        where: { id },
        select: rentalDisputeSelect,
    });
};

export const claimRentalDisputeForResolution = async (
  id: string
) => {
  try {
    return await prisma.rentalDispute.update({
      where: {
        id,
        status: RentalDisputeStatus.OPEN,
      },
      data: {
        status: RentalDisputeStatus.RESOLVING,
      },
      select: rentalDisputeSelect,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return null;
    }

    throw error;
  }
};

export const finalizeRentalDisputeResolution = async (
  id: string,
  resolution: RentalDisputeResolution,
  resolvedAt: Date
) => {
  try {
    return await prisma.rentalDispute.update({
      where: {
        id,
        status: RentalDisputeStatus.RESOLVING,
      },
      data: {
        status: RentalDisputeStatus.RESOLVED,
        resolution,
        resolvedAt,
      },
      select: rentalDisputeSelect,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return null;
    }

    throw error;
  }
};

export const reopenRentalDisputeAfterResolutionFailure = async (
  id: string
) => {
  try {
    return await prisma.rentalDispute.update({
      where: {
        id,
        status: RentalDisputeStatus.RESOLVING,
      },
      data: {
        status: RentalDisputeStatus.OPEN,
      },
      select: rentalDisputeSelect,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return null;
    }

    throw error;
  }
};

export const cancelRentalDispute = async (
  id: string,
  openedById: string
) => {
  try {
    return await prisma.rentalDispute.update({
      where: {
        id,
        openedById,
        status: RentalDisputeStatus.OPEN,
      },
      data: {
        status: RentalDisputeStatus.CANCELLED,
      },
      select: rentalDisputeSelect,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return null;
    }

    throw error;
  }
};

export const openRentalDisputeAtomically = async ({
    orderId,
    openedById,
    reason,
    details,
}: {
    orderId: string;
    openedById: string;
    reason: string;
    details: string | null;
}) => {
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await prisma.$transaction(async (tx) => {
                const order = await tx.order.findUnique({
                    where: { id: orderId },
                    select: {
                        id: true,
                        buyerId: true,
                        sellerId: true,
                        transactionType: true,
                        status: true,
                    },
                });

                if (!order) {
                    return { kind: "not-found" as const };
                }

                if (order.transactionType !== "RENT") {
                    return { kind: "not-rental" as const };
                }

                if (order.status !== OrderStatus.RETURN_PENDING) {
                    return { kind: "wrong-status" as const };
                }

                if (
                    order.buyerId !== openedById &&
                    order.sellerId !== openedById
                ) {
                    return { kind: "forbidden" as const };
                }

                const existing =
                    await tx.rentalDispute.findUnique({
                        where: { orderId },
                        select: rentalDisputeSelect,
                    });

                if (existing) {
                    return {
                        kind: "existing" as const,
                        dispute: existing,
                    };
                }

                const dispute =
                    await tx.rentalDispute.create({
                        data: {
                            orderId,
                            openedById,
                            reason,
                            details,
                            status: RentalDisputeStatus.OPEN,
                        },
                        select: rentalDisputeSelect,
                    });

                return {
                    kind: "opened" as const,
                    dispute,
                };
            }, {
                isolationLevel:
                    Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 10_000,
                timeout: 15_000,
            });
        } catch (caught) {
            const error =
                normalizeTransactionConflict(caught);

            if (
                error instanceof
                    Prisma.PrismaClientKnownRequestError &&
                error.code === "P2034" &&
                attempt < 2
            ) {
                continue;
            }

            if (
                error instanceof
                    Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                return {
                    kind: "existing" as const,
                };
            }

            if (
                error instanceof
                    Prisma.PrismaClientKnownRequestError &&
                error.code === "P2034"
            ) {
                return {
                    kind: "conflict" as const,
                };
            }

            throw error;
        }
    }
};