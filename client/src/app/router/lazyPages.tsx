import { lazy } from "react";

export const LoginPage = lazy(() => import("../../features/auth/pages/LoginPage").then((module) => ({ default: module.LoginPage })));
export const RegisterPage = lazy(() => import("../../features/auth/pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
export const ProductDetailPage = lazy(() => import("../../features/products/pages/ProductDetailPage").then((module) => ({ default: module.ProductDetailPage })));
export const ProductsPage = lazy(() => import("../../features/products/pages/ProductsPage").then((module) => ({ default: module.ProductsPage })));
export const MyProductsPage = lazy(() => import("../../features/products/pages/MyProductsPage").then((module) => ({ default: module.MyProductsPage })));
export const WishlistPage = lazy(() => import("../../features/products/pages/WishlistPage").then((module) => ({ default: module.WishlistPage })));
export const CreateProductPage = lazy(() => import("../../features/products/pages/CreateProductPage").then((module) => ({ default: module.CreateProductPage })));
export const EditProductPage = lazy(() => import("../../features/products/pages/EditProductPage").then((module) => ({ default: module.EditProductPage })));
export const HomePage = lazy(() => import("../../features/home/page/HomePage").then((module) => ({ default: module.HomePage })));
export const ConversationPage = lazy(() => import("../../features/messaging/pages/ConversationPage").then((module) => ({ default: module.ConversationPage })));
export const MessagesPage = lazy(() => import("../../features/messaging/pages/MessagesPage").then((module) => ({ default: module.MessagesPage })));
