import { createContext, useContext } from "react";

export type ProtectedAction = () => void;
export type AuthenticationGuard = (action: ProtectedAction) => void;

export const AuthenticationGuardContext = createContext<AuthenticationGuard | null>(null);

export const useAuthenticationGuard = (): AuthenticationGuard => {
  const guard = useContext(AuthenticationGuardContext);
  if (!guard) {
    throw new Error("useAuthenticationGuard requires AuthenticationGuardProvider");
  }
  return guard;
};
