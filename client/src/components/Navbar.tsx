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
          RentalPlace
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/">
            Home
          </Link>

          {token ? (
            <>
              <Link to="/">
                Home
              </Link>

              <Link to="/dashboard">
                Dashboard
              </Link>

              <Link
                to="/listings/new"
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
              >
                + List an Item
              </Link>

              <button onClick={logout}>
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