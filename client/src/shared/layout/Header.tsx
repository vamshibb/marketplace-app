import { ChevronDown } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuthStore, useCurrentUserQuery, useLogout } from "../../features/auth";
import { NotificationBell } from "../../features/notifications";

const navLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"}`;

export const Header = () => {
  const navigate = useNavigate();
  const logout = useLogout();
  const isAuthenticated = useAuthStore((state) => Boolean(state.token));
  const { data: currentUser } = useCurrentUserQuery();
  const accountInitial = (currentUser?.displayName ?? currentUser?.email)?.trim().charAt(0).toUpperCase() || "?";

  const handleLogout = (): void => {
    logout();
    navigate("/products");
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex min-h-17 flex-wrap items-center gap-x-3 md:flex-nowrap lg:gap-x-6">
          <Link to={isAuthenticated ? "/products" : "/"} className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <img
              src="/brand/marketplace-logo.png"
              alt="MarketPlace"
              className="h-16 w-auto"
            />
          </Link>

          <nav className="order-last flex w-full items-center gap-1 overflow-x-auto pb-2 md:order-none md:w-auto md:pb-0" aria-label="Main navigation">
            <NavLink to="/products" className={navLinkClassName}>Products</NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/my-products" className={navLinkClassName}>
                  My Products
                </NavLink>
                <NavLink to="/wishlist" className={navLinkClassName}>
                  Wishlist
                </NavLink>
                <NavLink to="/messages" className={navLinkClassName}>Messages</NavLink>
              </>
            )}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-1">
            {isAuthenticated ? (
              <>
              <NotificationBell key={currentUser?.id ?? "loading"} userId={currentUser?.id ?? ""} />
              <details
                className="relative min-w-0"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.currentTarget.open = false;
                    event.currentTarget.querySelector("summary")?.focus();
                  }
                }}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    event.currentTarget.open = false;
                  }
                }}
              >
                <summary className="flex max-w-44 cursor-pointer list-none items-center gap-2 rounded-lg p-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:max-w-60 [&::-webkit-details-marker]:hidden">
                  <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                    {accountInitial}
                  </span>
                  <span className="min-w-0 truncate">
                  {currentUser?.displayName ?? currentUser?.email ?? "Loading account…"}
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                </summary>
                <div className="absolute right-0 top-full z-20 mt-2 min-w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                  <button
                    type="button"
                    className="w-full rounded px-4 py-2 text-left hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </details>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClassName}>Login</NavLink>
                <NavLink to="/register" className={navLinkClassName}>Register</NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
