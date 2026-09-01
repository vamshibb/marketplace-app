import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { AppProviders } from "./app/providers/AppProviders";
import { AuthInitializer } from "./app/providers/AuthInitializer";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <AuthInitializer>
        <App />
      </AuthInitializer>
    </AppProviders>
  </StrictMode>,
);
