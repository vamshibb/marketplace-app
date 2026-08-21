import {
  NextFunction,
  Response,
} from "express";

import { AuthRequest } from "../middleware/authMiddleware";
import * as orderService from "../services/order.service";
import { successResponse } from "../utils/apiResponse";

export const createOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const order = await orderService.createOrder(
      req.params.productId,
      req.user!.id,
      req.body
    );

    return res.status(201).json(
      successResponse(
        order,
        "Order created successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getBuyerOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const orders = await orderService.getBuyerOrders(
      req.user!.id
    );

    return res.status(200).json(
      successResponse(orders)
    );
  } catch (error) {
    next(error);
  }
};

export const getSellerOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const orders = await orderService.getSellerOrders(
      req.user!.id
    );

    return res.status(200).json(
      successResponse(orders)
    );
  } catch (error) {
    next(error);
  }
};

export const getOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const order = await orderService.getOrder(
      req.params.orderId,
      req.user!.id
    );

    return res.status(200).json(
      successResponse(order)
    );
  } catch (error) {
    next(error);
  }
};

export const acceptOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const order = await orderService.acceptOrder(
      req.params.orderId,
      req.user!.id
    );

    return res.status(200).json(
      successResponse(
        order,
        "Order accepted successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

export const rejectOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const order = await orderService.rejectOrder(
      req.params.orderId,
      req.user!.id
    );

    return res.status(200).json(
      successResponse(
        order,
        "Order rejected successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const order = await orderService.cancelOrder(
      req.params.orderId,
      req.user!.id
    );

    return res.status(200).json(
      successResponse(
        order,
        "Order cancelled successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};
