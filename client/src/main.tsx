import React from "react";
import ReactDOM from "react-dom/client";

import { RouterProvider } from "react-router-dom";

import {
  QueryClientProvider,
} from "@tanstack/react-query";

import { router } from "./routes";
import { queryClient } from "./lib/queryClient";

import "./index.css";
import  {  Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);