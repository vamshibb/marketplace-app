import { useEffect, type RefObject } from "react";

export const useScrollToTarget = <T extends HTMLElement>(
  ref: RefObject<T | null>, trigger: string | null, ready: boolean, highlight = false,
): void => {
  useEffect(() => {
    const element = ref.current;
    if (!trigger || !ready || !element) return;
    element.scrollIntoView({ block: "center" });
    element.focus({ preventScroll: true });
    if (!highlight) return;
    element.dataset.highlighted = "true";
    const timer = window.setTimeout(() => { delete element.dataset.highlighted; }, 4000);
    return () => {
      window.clearTimeout(timer);
      delete element.dataset.highlighted;
    };
  }, [ref, trigger, ready, highlight]);
};
