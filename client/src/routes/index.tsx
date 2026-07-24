import { createBrowserRouter } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import DashboardPage from "../pages/DashboardPage";

import ProtectedRoute from "./ProtectedRoute";
import ListingPage from "../features/listings/pages/ListingPage";

export const router =
  createBrowserRouter([
    {
      path: "/",
      element: <MainLayout />,
      children: [
        {
          index: true,
          element: <HomePage />,
        },
        {
          path: "login",
          element: <LoginPage />,
        },
        {
          path: "register",
          element: <RegisterPage />,
        },
        {
          path: "listings/:id",
          element: <ListingPage />,
        },
        {
          element: <ProtectedRoute />,
          children: [
            {
              path: "dashboard",
              element: (
                <DashboardPage />
              ),
            },
          ],
        },
      ],
    },
  ]);