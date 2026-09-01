import { createBrowserRouter } from "react-router-dom";

import { LoginPage } from "../../features/auth/pages/LoginPage";
import { RegisterPage } from "../../features/auth/pages/RegisterPage";
import { ProductDetailPage } from "../../features/products/pages/ProductDetailPage";
import { ProductsPage } from "../../features/products/pages/ProductsPage";
import { CreateProductPage } from "../../features/products/pages/CreateProductPage";
import { EditProductPage } from "../../features/products/pages/EditProductPage";
import { HomePage } from "../../features/home/page/HomePage";
import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    element: <GuestRoute />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/register",
        element: <RegisterPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/products",
        element: <ProductsPage />,
      },
      {
        path: "/products/create",
        element: <CreateProductPage />,
      },
      {
        path: "/products/:id",
        element: <ProductDetailPage />,
      },
      {
        path: "/products/:id/edit",
        element: <EditProductPage />,
      },
    ],
  },
]);
