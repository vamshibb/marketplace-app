import { validateRentalRequest } from "./rentalRules";
import {
  OrderStatus,
  Prisma,
} from "../generated/prisma";
import { toOrderDTO } from "../dto/order.dto";
import { AppError } from "../errors/AppError";
import * as authRepository from "../repositories/auth.repository";
import * as orderRepository from "../repositories/order.repository";
import * as productRepository from "../repositories/product.repository";
import * as notificationService from "./notification.service";

type OrderRecord = NonNullable<
  Awaited<
    ReturnType<typeof orderRepository.findOrderById>
  >
>;

interface OrderCreateData {
  quantity?: number;
  requestedFrom?: Date;
  requestedTo?: Date;
  notes?: string;
}

const ensureOrderExists = async (
  orderId: string
) => {
  const order = await orderRepository.findOrderById(orderId);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
};

const ensureUserExists = async (
  userId: string
) => {
  const user = await authRepository.findUserById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

const ensureBuyer = (
  order: OrderRecord,
  userId: string
) => {
  if (order.buyerId !== userId) {
    throw new AppError(
      "You are not authorized to perform this action.",
      403
    );
  }
};

const ensureSeller = (
  order: OrderRecord,
  userId: string
) => {
  if (order.sellerId !== userId) {
    throw new AppError(
      "You are not authorized to perform this action.",
      403
    );
  }
};

const ensurePendingOrder = (
  order: OrderRecord,
  action: "accepted" | "rejected" | "cancelled"
) => {
  if (order.status !== OrderStatus.PENDING) {
    throw new AppError(
      `Only pending orders can be ${action}.`,
      409
    );
  }
};

const ensureProductCanBeOrdered = async (
  productId: string,
  buyerId: string
) => {
  const product = await productRepository.findProductById(
    productId
  );

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (product.sellerId === buyerId) {
    throw new AppError(
      "You cannot order your own product",
      400
    );
  }

  const activeOrder = product.listingType === "RENT" ? null :
    await orderRepository.findActiveOrderByBuyerAndProduct(
      buyerId,
      productId
    );

  if (activeOrder) {
    throw new AppError(
      "An active order already exists for this product",
      409
    );
  }

  return product;
};

const buildOrderCreateInput = (
  product: Awaited<
    ReturnType<typeof ensureProductCanBeOrdered>
  >,
  buyerId: string,
  data: OrderCreateData
): Prisma.OrderUncheckedCreateInput => {
  return {
    buyerId,
    sellerId: product.sellerId,
    productId: product.id,
    productTitle: product.title,
    unitPrice: product.price,
    transactionType: product.listingType,
    quantity: data.quantity ?? 1,
    requestedFrom: data.requestedFrom,
    requestedTo: data.requestedTo,
    notes: data.notes,
  };
};

export const createOrder = async (
  productId: string,
  buyerId: string,
  data: OrderCreateData
) => {
  const product = await ensureProductCanBeOrdered(
    productId,
    buyerId
  );

  if (product.listingType === "RENT") {
    data = { ...data, ...validateRentalRequest(product, data) };
  }

  const buyer = await ensureUserExists(buyerId);

  const orderData = buildOrderCreateInput(
    product,
    buyerId,
    data
  );

  const order = await orderRepository.createOrder(orderData);

  await notificationService.notifyOrderCreated({
    recipientId: product.sellerId,
    sender: buyer,
    product: {
      id: product.id,
      title: product.title,
    },
    orderId: order.id,
  });

  return toOrderDTO(order);
};

export const acceptOrder = async (
  orderId: string,
  sellerId: string
) => {
  const order = await ensureOrderExists(orderId);

  ensureSeller(order, sellerId);
  ensurePendingOrder(order, "accepted");

  let updatedOrder;
  if (order.transactionType === "RENT") {
    const result = await orderRepository.acceptRentalOrder(orderId, sellerId);
    if (result.kind === "unavailable") {
      throw new AppError("Rental availability conflict: insufficient quantity for these dates.", 409);
    }
    if (result.kind === "conflict") {
      throw new AppError("Order changed concurrently. Please refresh and try again.", 409);
    }
    updatedOrder = result.order;
  } else {
    updatedOrder = await orderRepository.updateOrderStatus(
      orderId, OrderStatus.ACCEPTED, OrderStatus.PENDING, { sellerId }
    );
  }
  if (!updatedOrder) throw new AppError("Only pending orders can be accepted.", 409);

  const seller = await ensureUserExists(sellerId);

  await notificationService.notifyOrderAccepted({
    recipientId: order.buyerId,
    sender: seller,
    product: order.product,
    orderId: order.id,
  });

  return toOrderDTO(updatedOrder);
};

export const rejectOrder = async (
  orderId: string,
  sellerId: string
) => {
  const order = await ensureOrderExists(orderId);

  ensureSeller(order, sellerId);
  ensurePendingOrder(order, "rejected");

  const updatedOrder = await orderRepository.updateOrderStatus(
    orderId,
    OrderStatus.REJECTED,
    OrderStatus.PENDING,
    { sellerId }
  );
  if (!updatedOrder) throw new AppError("Only pending orders can be rejected.", 409);

  const seller = await ensureUserExists(sellerId);

  await notificationService.notifyOrderRejected({
    recipientId: order.buyerId,
    sender: seller,
    product: order.product,
    orderId: order.id,
  });

  return toOrderDTO(updatedOrder);
};

export const cancelOrder = async (
  orderId: string,
  buyerId: string
) => {
  const order = await ensureOrderExists(orderId);

  ensureBuyer(order, buyerId);
  ensurePendingOrder(order, "cancelled");

  const updatedOrder = await orderRepository.updateOrderStatus(
    orderId,
    OrderStatus.CANCELLED,
    OrderStatus.PENDING,
    { buyerId }
  );
  if (!updatedOrder) throw new AppError("Only pending orders can be cancelled.", 409);

  return toOrderDTO(updatedOrder);
};

export const getBuyerOrders = async (
  buyerId: string
) => {
  const orders = await orderRepository.findOrdersByBuyer(buyerId);

  return orders.map(toOrderDTO);
};

export const getSellerOrders = async (
  sellerId: string
) => {
  const orders = await orderRepository.findOrdersBySeller(sellerId);

  return orders.map(toOrderDTO);
};

export const getOrder = async (
  orderId: string,
  userId: string
) => {
  const order = await ensureOrderExists(orderId);

  if (
    order.buyerId !== userId &&
    order.sellerId !== userId
  ) {
    throw new AppError(
      "You are not authorized to perform this action.",
      403
    );
  }

  return toOrderDTO(order);
};

export const completeOrder = async (orderId: string, buyerId: string) => {
  const order = await ensureOrderExists(orderId);
  ensureBuyer(order, buyerId);
  if (order.transactionType !== "SALE") throw new AppError("Rental orders must use the rental return lifecycle.", 409);
  if (order.status !== OrderStatus.ACCEPTED) {
    throw new AppError("Only accepted orders can be completed.", 409);
  }
  const updatedOrder = await orderRepository.updateOrderStatus(
    orderId, OrderStatus.COMPLETED, OrderStatus.ACCEPTED, { buyerId }, "SALE"
  );
  if (!updatedOrder) throw new AppError("Only accepted orders can be completed.", 409);

  await notificationService.notifyOrderCompleted({
    recipientId: updatedOrder.sellerId,
    sender: updatedOrder.buyer,
    product: updatedOrder.product,
    orderId: updatedOrder.id,
  });
  return toOrderDTO(updatedOrder);
};

type RentalAction = "start" | "return" | "confirm-return";
const rentalTransitions = {
  start: { from: OrderStatus.ACCEPTED, to: OrderStatus.ACTIVE, role: "seller" },
  return: { from: OrderStatus.ACTIVE, to: OrderStatus.RETURN_PENDING, role: "buyer" },
  "confirm-return": { from: OrderStatus.RETURN_PENDING, to: OrderStatus.COMPLETED, role: "seller" },
} as const;

export const transitionRental = async (orderId: string, userId: string, action: RentalAction) => {
  const order = await ensureOrderExists(orderId);
  const transition = rentalTransitions[action];
  if (transition.role === "seller") ensureSeller(order, userId);
  else ensureBuyer(order, userId);
  if (order.transactionType !== "RENT" || order.status !== transition.from) {
    throw new AppError(`Only ${transition.from} rental orders support this action.`, 409);
  }
  const actor = transition.role === "seller" ? { sellerId: userId } : { buyerId: userId };
  const updated = await orderRepository.updateOrderStatus(
    orderId, transition.to, transition.from, actor, "RENT"
  );
  if (!updated) throw new AppError("Order changed concurrently. Please refresh and try again.", 409);
  await notificationService.notifyRentalTransition({
    recipientId: transition.role === "seller" ? updated.buyerId : updated.sellerId,
    sender: transition.role === "seller" ? updated.seller : updated.buyer,
    product: updated.product,
    orderId: updated.id,
  }, action);
  return toOrderDTO(updated);
};

