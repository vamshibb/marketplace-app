import { Outlet } from "react-router-dom";

export const AuthLayout = () => (
  <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
      <Outlet />
    </div>
  </main>
);
