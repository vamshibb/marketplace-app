import { useEffect, useId, useRef, useState, type ReactElement } from "react";

import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal = ({ onClose, onSuccess }: AuthModalProps): ReactElement => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/50"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id={headingId} className="text-2xl font-semibold">
          {mode === "login" ? "Sign in" : "Create an account"}
        </h2>
        <button type="button" onClick={onClose} aria-label="Close authentication dialog" className="rounded px-3 py-2 text-sm hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600">
          Close
        </button>
      </div>
      {mode === "login" ? <LoginForm onSuccess={onSuccess} /> : <RegisterForm onSuccess={onSuccess} />}
      <p className="mt-6 text-center text-sm text-gray-600">
        {mode === "login" ? "Don't have an account? " : "Already have an account? "}
        <button type="button" className="rounded font-medium text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Register" : "Login"}
        </button>
      </p>
    </dialog>
  );
};
