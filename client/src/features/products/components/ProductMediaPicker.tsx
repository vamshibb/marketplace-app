import { MediaGrid, mediaTileClass } from "./MediaGrid";
import { LocalMediaPreview } from "./LocalMediaPreview";
import { mediaAccept, validateMediaFiles } from "../utils/mediaFiles";
import { X } from "lucide-react";
import { useRef, useState } from "react";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled: boolean;
}

export const ProductMediaPicker = ({ files, onChange, disabled }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const addFiles = (incoming: File[]) => {
    if (disabled) return;
    const error = validateMediaFiles(incoming, files.length);
    if (error) { setError(error); return; }
    setError("");
    onChange([...files, ...incoming]);
  };
  const cover = files.find((file) => file.type.startsWith("image/"));
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Photos &amp; video</h2>
        <p className="shrink-0 text-sm text-slate-500" aria-live="polite">{files.length} / 10</p>
      </div>
      <input ref={input} type="file" multiple accept={mediaAccept}
        disabled={disabled} className="hidden" aria-label="Choose photos and videos"
        onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      <MediaGrid label="Media slots" occupied={files.length} disabled={disabled}
        onAdd={() => input.current?.click()} onFiles={addFiles}>
        {files.map((file, index) => (
          <li key={index} className={mediaTileClass}>
            <div className="absolute inset-0 overflow-hidden rounded-lg"><LocalMediaPreview file={file} /></div>
            <button type="button" disabled={disabled} aria-label={`Remove ${file.name}`}
              onClick={() => { onChange(files.filter((_, i) => i !== index)); setError(""); }}
              className="absolute top-1 right-1 rounded-full bg-white/95 p-1 text-slate-600 shadow-sm hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
              <X className="size-4" aria-hidden="true" />
            </button>
            {file === cover && <span className="absolute bottom-1 left-1 rounded bg-blue-600 px-1 py-0.5 text-xs font-medium text-white">Cover</span>}
          </li>
        ))}
      </MediaGrid>
      <div className="space-y-1 text-xs leading-5 text-slate-500">
        <p>JPEG, PNG, WebP up to 10 MB. MP4, MOV, WebM up to 100 MB.</p>
        <p>The first image becomes the cover photo. Select a slot or drop files to add media.</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  );
};
