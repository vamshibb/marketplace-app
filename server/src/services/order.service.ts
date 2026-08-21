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
    throw new AppError("Forbidden", 403);
  }
};

const ensureSeller = (
  order: OrderRecord,
  userId: string
) => {
  if (order.sellerId !== userId) {
    throw new AppError("Forbidden", 403);
  }
};

const ensurePendingOrder = (
  order: OrderRecord
) => {
  if (order.status !== OrderStatus.PENDING) {
    throw new AppError("Order is not pending", 400);
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

  const activeOrder =
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

  const buyer = await ensureUserExists(buyerId);

  const orderData = buildOrderCreateInput(
    product,
    buyerId,
    data
  );

  const order = await orderRepository.createOrder(orderData);

  try {
    await notificationService.notifyOrderCreated({
      recipientId: product.sellerId,
      sender: buyer,
      product: {
        id: product.id,
        title: product.title,
      },
      orderId: order.id,
    });
  } catch (error) {
    console.error("Failed to create order notification", error);
  }

  return toOrderDTO(order);
};

export const acceptOrder = async (
  orderId: string,
  sellerId: string
) => {
  const order = await ensureOrderExists(orderId);

  ensureSeller(order, sellerId);
  ensurePendingOrder(order);

  const updatedOrder = await orderRepository.updateOrderStatus(
    orderId,
    OrderStatus.ACCEPTED
  );

  const seller = await ensureUserExists(sellerId);

  try {
    await notificationService.notifyOrderAccepted({
      recipientId: order.buyerId,
      sender: seller,
      product: order.product,
      orderId: order.id,
    });
  } catch (error) {
    console.error(
      "Failed to create order accepted notification",
      error
    );
  }

  return toOrderDTO(updatedOrder);
};

export const rejectOrder = async (
  orderId: string,
  sellerId: string
) => {
  const order = await ensureOrderExists(orderId);

  ensureSeller(order, sellerId);
  ensurePendingOrder(order);

  const updatedOrder = await orderRepository.updateOrderStatus(
    orderId,
    OrderStatus.REJECTED
  );

  const seller = await ensureUserExists(sellerId);

  try {
    await notificationService.notifyOrderRejected({
      recipientId: order.buyerId,
      sender: seller,
      product: order.product,
      orderId: order.id,
    });
  } catch (error) {
    console.error(
      "Failed to create order rejected notification",
      error
    );
  }

  return toOrderDTO(updatedOrder);
};

export const cancelOrder = async (
  orderId: string,
  buyerId: string
) => {
  const order = await ensureOrderExists(orderId);

  ensureBuyer(order, buyerId);
  ensurePendingOrder(order);

  const updatedOrder = await orderRepository.updateOrderStatus(
    orderId,
    OrderStatus.CANCELLED
  );

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
    throw new AppError("Forbidden", 403);
  }

  return toOrderDTO(order);
};
