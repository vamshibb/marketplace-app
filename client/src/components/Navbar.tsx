import { Link } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

function Navbar() {
  const {
    token,
    logout,
  } = useAuthStore();

  return (
    <header className="border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="text-2xl font-bold"
        >
          MarketPlace
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/">
            Home
          </Link>

          {token ? (
            <>
              <Link to="/dashboard">
                Dashboard
              </Link>

              <button
                onClick={logout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                Login
              </Link>

              <Link to="/register">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;