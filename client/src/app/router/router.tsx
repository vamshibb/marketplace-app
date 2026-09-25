import { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";

import {
  LoginPage,
  RegisterPage,
  ProductDetailPage,
  ProductsPage,
  MyProductsPage,
  WishlistPage,
  CreateProductPage,
  EditProductPage,
  HomePage,
  ConversationPage,
  MessagesPage,
  OrdersPage,
} from "./lazyPages";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Suspense fallback={<p>Loading...</p>}><HomePage /></Suspense>,
  },
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: "/login",
            element: <Suspense fallback={<p>Loading...</p>}><LoginPage /></Suspense>,
          },
          {
            path: "/register",
            element: <Suspense fallback={<p>Loading...</p>}><RegisterPage /></Suspense>,
          },
        ],
      },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      {
        path: "/products",
        element: <Suspense fallback={<p>Loading...</p>}><ProductsPage /></Suspense>,
      },
      {
        path: "/products/:id",
        element: <Suspense fallback={<p>Loading...</p>}><ProductDetailPage /></Suspense>,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/orders",
            element: <Suspense fallback={<p>Loading...</p>}><OrdersPage /></Suspense>,
          },
          {
            path: "/messages",
            element: <Suspense fallback={<p>Loading...</p>}><MessagesPage /></Suspense>,
          },
          {
            path: "/messages/:conversationId",
            element: <Suspense fallback={<p>Loading...</p>}><ConversationPage /></Suspense>,
          },
          {
            path: "/my-products",
            element: <Suspense fallback={<p>Loading...</p>}><MyProductsPage /></Suspense>,
          },
          {
            path: "/wishlist",
            element: <Suspense fallback={<p>Loading...</p>}><WishlistPage /></Suspense>,
          },
          {
            path: "/products/create",
            element: <Suspense fallback={<p>Loading...</p>}><CreateProductPage /></Suspense>,
          },
          {
            path: "/products/:id/edit",
            element: <Suspense fallback={<p>Loading...</p>}><EditProductPage /></Suspense>,
          },
        ],
      },
    ],
  },
]);
