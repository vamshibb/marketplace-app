import { Prisma } from "../generated/prisma";
import { prisma } from "../prisma/client";

export const rentalDisputeSelect = {
    id: true,
    orderId: true,
    openedById: true,
    reason: true,
    details: true,
    status: true,
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
