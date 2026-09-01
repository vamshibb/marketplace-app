import { Link } from "react-router-dom";

import { Container } from "./Container";

export const Header = () => (
  <header className="border-b">
    <Container>
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="text-xl font-semibold"
        >
          Marketplace
        </Link>
        <nav aria-label="Main navigation">
          <Link to="/products">Products</Link>
          <Link to="/products/create">Create Product</Link>
        </nav>
      </div>
    </Container>
  </header>
);
