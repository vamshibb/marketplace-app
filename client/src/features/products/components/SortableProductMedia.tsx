import { mediaTileClass } from "./MediaGrid";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, X, Star, Replace } from "lucide-react";
import type { ReactElement } from "react";
import type { ProductMedia } from "../types";

interface SortableProductMediaProps {
  item: ProductMedia;
  index: number;
  cover: boolean;
  disabled: boolean;
  removingDisabled: boolean;
  onRemove: () => void;
  onCover: () => void;
  onReplace: () => void;
}

export const SortableProductMedia = ({ item, index, cover, disabled, removingDisabled, onRemove, onCover, onReplace }: SortableProductMediaProps): ReactElement => {
  const { ref, handleRef, isDragging } = useSortable({ id: item.id, index, disabled });
  const label = `${item.mediaType === "IMAGE" ? "Image" : "Video"} ${index + 1}`;
  const controlClass = "absolute flex size-7 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-sm focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40";
  return <li ref={ref} className={`${mediaTileClass} ${isDragging ? "z-10 ring-2 ring-blue-500 shadow-lg" : ""}`}>
    <div className="absolute inset-0 overflow-hidden rounded-lg">
      {item.mediaType === "VIDEO"
        ? <video src={item.url} aria-label={label} controls playsInline preload="metadata" className="h-full w-full object-cover" />
        : <img src={item.url} alt={label} draggable={false} className="h-full w-full object-cover" />}
    </div>
    {cover && <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-blue-600 px-1 py-0.5 text-xs font-medium text-white">Cover</span>}
    <button type="button" className={`${controlClass} top-1 right-1 hover:bg-red-50 hover:text-red-600`}
      aria-label={`Remove ${label.toLowerCase()}`} disabled={removingDisabled} onClick={onRemove}>
      <X className="size-4" aria-hidden="true" />
    </button>
    <button type="button" className={`${controlClass} top-1 left-1`} disabled={removingDisabled}
      aria-label={`Replace ${label.toLowerCase()}`} title="Replace media" onClick={onReplace}>
      <Replace className="size-4" aria-hidden="true" />
    </button>
    {item.mediaType === "IMAGE" && !cover && <button type="button" className={`${controlClass} bottom-1 left-1`}
      disabled={removingDisabled} aria-label={`Set ${label.toLowerCase()} as cover`} title="Set as cover" onClick={onCover}>
      <Star className="size-4" aria-hidden="true" />
    </button>}
    <button ref={handleRef} type="button" className={`${controlClass} right-1 bottom-1 touch-none cursor-grab hover:text-blue-600 active:cursor-grabbing`}
      aria-label={`Reorder ${label.toLowerCase()}`} disabled={disabled}>
      <GripVertical className="size-4" aria-hidden="true" />
    </button>
  </li>;
};
