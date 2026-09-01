import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "../../features/auth/hooks/useAuthStore";

export const GuestRoute = () => {
  const token = useAuthStore((state) => state.token);

  if (token) {
    return <Navigate to="/products" replace />;
  }

  return <Outlet />;
};
