import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useState, type ReactElement } from "react";
import type { ProductMedia } from "../types";
import { ProductImage } from "./ProductImage";

interface ProductDetailGalleryProps {
  media: ProductMedia[];
  title: string;
}

export const ProductDetailGallery = ({ media, title }: ProductDetailGalleryProps): ReactElement => {
  const items = media.filter((item) => item.mediaType === "IMAGE" || item.mediaType === "VIDEO").sort((a, b) => a.sortOrder - b.sortOrder);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIndex = Math.max(0, items.findIndex((item) => item.id === selectedId));
  const selected = items[selectedIndex];
  const cycle = (direction: number): void => {
    setSelectedId(items[(selectedIndex + direction + items.length) % items.length].id);
  };
  const arrowClassName = "absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-sm hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

  return (
    <section aria-label="Product media" className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-[320px] bg-gray-50 p-4 lg:h-auto lg:min-h-0 lg:flex-1">
        {selected?.mediaType === "VIDEO" ? (
          <video
            key={selected.id}
            src={selected.url}
            aria-label={`${title} - video ${selectedIndex + 1} of ${items.length}`}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full object-contain object-center"
          />
        ) : selected ? (
          <img src={selected.url} alt={`${title} - image ${selectedIndex + 1} of ${items.length}`} className="h-full w-full object-contain object-center" />
        ) : (
          <div className="h-full [&>div]:rounded-none [&>div]:border-0"><ProductImage alt={title} /></div>
        )}
        {items.length > 1 && <>
          <button type="button" aria-label="Previous media" onClick={() => cycle(-1)} className={`${arrowClassName} left-3`}><ChevronLeft className="size-5" aria-hidden="true" /></button>
          <button type="button" aria-label="Next media" onClick={() => cycle(1)} className={`${arrowClassName} right-3`}><ChevronRight className="size-5" aria-hidden="true" /></button>
          <span className="sr-only" aria-live="polite">Media {selectedIndex + 1} of {items.length}</span>
        </>}
      </div>
      {items.length > 1 && (
        <div role="group" aria-label="Choose product media" className="flex shrink-0 gap-2 overflow-x-auto border-t border-slate-200 p-3">
          {items.map((item, index) => (
            <button key={item.id} type="button" aria-label={`Show ${item.mediaType === "VIDEO" ? "video" : "image"} ${index + 1}`} aria-pressed={selected.id === item.id}
              onClick={() => setSelectedId(item.id)}
              className={`size-14 shrink-0 overflow-hidden rounded-lg border-2 bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${selected.id === item.id ? "border-blue-600 ring-1 ring-blue-600" : "border-slate-200 hover:border-slate-400"}`}>
              {item.mediaType === "VIDEO" ? (
                <span className="flex h-full w-full items-center justify-center text-slate-600">
                  <Play className="size-5" aria-hidden="true" />
                </span>
              ) : (
                <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
