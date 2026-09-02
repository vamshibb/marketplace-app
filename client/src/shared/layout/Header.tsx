import { Link, useNavigate } from "react-router-dom";

import { useCurrentUserQuery } from "../../features/auth/hooks/useCurrentUserQuery";
import { useLogout } from "../../features/auth/hooks/useLogout";
import { Button } from "../ui/Button";
import { Container } from "./Container";

export const Header = () => {
  const navigate = useNavigate();
  const logout = useLogout();
  const { data: currentUser } = useCurrentUserQuery();

  const handleLogout = (): void => {
    logout();
    navigate("/login");
  };

  return (
    <header className="border-b">
      <Container>
        <div className="flex items-center justify-between gap-6">
          <Link to={currentUser ? "/products" : "/"}>Marketplace</Link>

          <nav className="flex gap-4" aria-label="Main navigation">
            <Link to="/products">Products</Link>
            {currentUser && <Link to="/products/create">Create Product</Link>}
          </nav>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <>
                <span>{currentUser.email}</span>
                <Button variant="secondary" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
};
