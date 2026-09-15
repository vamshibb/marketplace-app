import { Link, Outlet } from "react-router-dom";

import { LOGIN_REQUIRED_MESSAGE, useAuthStore } from "../../features/auth";

export const ProtectedRoute = () => {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return (
      <section className="space-y-4 py-6">
        <p role="alert">{LOGIN_REQUIRED_MESSAGE}</p>
        <Link to="/products" className="text-blue-600 underline">Back to products</Link>
      </section>
    );
  }

  return <Outlet />;
};
