import type { PropsWithChildren } from "react";

export const Container = ({ children }: PropsWithChildren) => (
  <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
);
