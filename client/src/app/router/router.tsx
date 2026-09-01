import { createBrowserRouter } from "react-router-dom";

import { LoginPage } from "../../features/auth/pages/LoginPage";
import { RegisterPage } from "../../features/auth/pages/RegisterPage";

const Marketplace = () => <h1>Marketplace</h1>;

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Marketplace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
]);
