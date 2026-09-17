import { Link, useNavigate } from "react-router-dom";

import { useAuthStore, useCurrentUserQuery, useLogout } from "../../features/auth";

export const Header = () => {
  const navigate = useNavigate();
  const logout = useLogout();
  const isAuthenticated = useAuthStore((state) => Boolean(state.token));
  const { data: currentUser } = useCurrentUserQuery();

  const handleLogout = (): void => {
    logout();
    navigate("/products");
  };

  return (
    <header className="border-b">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center justify-between gap-6">
          <Link to={isAuthenticated ? "/products" : "/"}>
            <img
              src="/brand/marketplace-logo.png"
              alt="MarketPlace"
              className="h-20 w-auto"
            />
          </Link>

          <nav className="flex items-center gap-4" aria-label="Main navigation">
            <Link to="/products">Products</Link>
            {isAuthenticated && (
              <>
                <Link to="/my-products">
                  My Products
                </Link>
                <span aria-disabled="true" className="cursor-default text-gray-500" title="Coming soon">
                  Wishlist
                </span>
              </>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <details
                className="relative"
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
                <summary className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  {currentUser?.email ?? "Loading account…"}
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
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
