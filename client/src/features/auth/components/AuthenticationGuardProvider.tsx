import { useCallback, useRef, useState, type PropsWithChildren, type ReactElement } from "react";

import { useAuthStore } from "../hooks/useAuthStore";
import { AuthenticationGuardContext, type ProtectedAction } from "../hooks/useAuthenticationGuard";
import { AuthModal } from "./AuthModal";

interface PendingAction {
  action: ProtectedAction;
}

export const AuthenticationGuardProvider = ({ children }: PropsWithChildren): ReactElement => {
  const pendingAction = useRef<PendingAction | null>(null);
  const [request, setRequest] = useState<PendingAction | null>(null);

  const cancel = useCallback((): void => {
    pendingAction.current = null;
    setRequest(null);
  }, []);

  const guard = useCallback((action: ProtectedAction): void => {
    if (useAuthStore.getState().token) {
      action();
      return;
    }
    // Keep the original action while an authentication request is already open.
    if (pendingAction.current) return;
    const nextRequest = { action };
    pendingAction.current = nextRequest;
    setRequest(nextRequest);
  }, []);

  const complete = (): void => {
    // Ignore a late response after cancellation or from a previous modal.
    if (!request || pendingAction.current !== request || !useAuthStore.getState().token) return;
    const { action } = request;
    cancel();
    action();
  };

  return (
    <AuthenticationGuardContext.Provider value={guard}>
      {children}
      {request && <AuthModal onClose={cancel} onSuccess={complete} />}
    </AuthenticationGuardContext.Provider>
  );
};
