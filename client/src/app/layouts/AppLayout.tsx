import { Outlet } from "react-router-dom";

import { Container } from "../../shared/layout/Container";
import { Footer } from "../../shared/layout/Footer";
import { Header } from "../../shared/layout/Header";

export const AppLayout = () => (
  <div className="flex min-h-screen flex-col">
    <Header />
    <main className="flex-1">
      <Container>
        <Outlet />
      </Container>
    </main>
    <Footer />
  </div>
);
