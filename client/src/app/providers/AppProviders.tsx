import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { Toaster } from "react-hot-toast";

import { AuthenticationGuardProvider } from "../../features/auth";

import { queryClient } from "./queryClient";

export const AppProviders = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>
    <AuthenticationGuardProvider>{children}</AuthenticationGuardProvider>
    <Toaster />
  </QueryClientProvider>
);
