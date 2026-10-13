import { Plus } from "lucide-react";
import type { ReactNode } from "react";

export const mediaTileClass = "relative h-full w-full min-h-24 min-w-0 rounded-lg border border-slate-200 bg-slate-50 sm:min-h-0";

interface Props {
  children: ReactNode;
  occupied: number;
  label: string;
  disabled: boolean;
  onAdd: () => void;
  onFiles: (files: File[]) => void;
}

export const MediaGrid = ({ children, occupied, label, disabled, onAdd, onFiles }: Props) => (
  <ul aria-label={label} className="grid min-h-64 w-full min-w-0 flex-1 grid-cols-2 auto-rows-fr gap-2 min-[400px]:grid-cols-3 sm:grid-cols-5 sm:grid-rows-2"
    onDragOver={event => event.preventDefault()}
    onDrop={event => { event.preventDefault(); onFiles(Array.from(event.dataTransfer.files)); }}>
    {children}
    {Array.from({ length: Math.max(0, 10 - occupied) }, (_, index) => (
      <li key={index} className="relative h-full w-full min-h-24 min-w-0 sm:min-h-0">
        <button type="button" disabled={disabled} aria-label={`Add media in slot ${occupied + index + 1}`}
          onClick={onAdd}
          className="absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-blue-500 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="size-6" aria-hidden="true" />
        </button>
      </li>
    ))}
  </ul>
);
