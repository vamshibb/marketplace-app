import { useEffect, useId, useRef, useState, type ReactElement } from "react";

interface ProductDescriptionProps {
  description: string;
}

export const ProductDescription = ({ description }: ProductDescriptionProps): ReactElement => {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const descriptionId = useId();

  useEffect(() => {
    const paragraph = paragraphRef.current;
    if (!paragraph) return;

    // Measure rendered lines, so wrapping and explicit line breaks both count.
    const observer = new ResizeObserver(() => {
      const lineHeight = Number.parseFloat(getComputedStyle(paragraph).lineHeight);
      setCanExpand(paragraph.scrollHeight > lineHeight * 3 + 1);
    });
    observer.observe(paragraph);
    return () => observer.disconnect();
  }, [description]);

  return (
    <section className="space-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight text-gray-950">Description</h2>
      <p
        ref={paragraphRef}
        id={descriptionId}
        className={`text-sm leading-6 wrap-anywhere whitespace-pre-wrap text-slate-600 ${expanded ? "" : "line-clamp-3"}`}
      >
        {description}
      </p>
      {canExpand && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={descriptionId}
          className="inline-flex min-h-8 items-center rounded text-sm font-semibold text-blue-600 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </section>
  );
};
