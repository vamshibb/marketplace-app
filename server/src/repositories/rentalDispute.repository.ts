import { Prisma,RentalDisputeResolution,RentalDisputeStatus} from "../generated/prisma";
import { prisma } from "../prisma/client";

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

export const resolveRentalDispute = (
    id: string,
    resolution: RentalDisputeResolution,
    resolvedAt: Date
) => {
    return prisma.rentalDispute.update({
        where: { id },
        data: {
            status: "RESOLVED",
            resolution,
            resolvedAt,
        },
        select: rentalDisputeSelect,
    });
};

export const cancelRentalDispute = (
    id: string
) => {
    return prisma.rentalDispute.update({
        where: { id },
        data: {
            status: RentalDisputeStatus.CANCELLED,
        },
        select: rentalDisputeSelect,
    });
};