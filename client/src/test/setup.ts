import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// The sortable sensor observes tile dimensions in browsers. jsdom has no layout observer.
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
