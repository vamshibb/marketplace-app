import { Plus, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled: boolean;
}

const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const videoTypes = ["video/mp4", "video/quicktime", "video/webm"];

const MediaPreview = ({ file }: { file: File }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const preview = URL.createObjectURL(file);
    const element = imageRef.current ?? videoRef.current;
    if (element) element.src = preview;
    return () => URL.revokeObjectURL(preview);
  }, [file]);
  return file.type.startsWith("video/") ? (
    <>
      <video ref={videoRef} playsInline preload="metadata" aria-label={file.name} className="h-full w-full object-contain" />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Play className="size-8 rounded-full bg-slate-900/70 p-2 text-white" aria-hidden="true" />
        <span className="sr-only">Video</span>
      </span>
    </>
  ) : (
    <img ref={imageRef} alt={file.name} className="h-full w-full object-contain" />
  );
};

export const ProductMediaPicker = ({ files, onChange, disabled }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const addFiles = (incoming: File[]) => {
    if (disabled) return;
    if (files.length + incoming.length > 10) {
      setError("Choose up to 10 photos and videos.");
      return;
    }
    for (const file of incoming) {
      const image = imageTypes.includes(file.type);
      if (!image && !videoTypes.includes(file.type)) {
        setError("Choose JPEG, PNG, WebP, MP4, MOV or WebM files.");
        return;
      }
      if (file.size > (image ? 10 : 100) * 1024 * 1024) {
        setError(image ? "Images must be 10 MB or smaller." : "Videos must be 100 MB or smaller.");
        return;
      }
    }
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
      <input ref={input} type="file" multiple accept={[...imageTypes, ...videoTypes].join(",")}
        disabled={disabled} className="hidden" aria-label="Choose photos and videos"
        onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      <ul aria-label="Media slots"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); addFiles(Array.from(event.dataTransfer.files)); }}
        className="grid min-h-64 grid-cols-5 grid-rows-2 gap-2 lg:flex-1">
        {Array.from({ length: 10 }, (_, index) => {
          const file = files[index];
          return (
            <li key={index} className="relative min-h-0 min-w-0">
              {file ? (
                <div className="absolute inset-0 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="absolute inset-1"><MediaPreview file={file} /></div>
                  <button type="button" disabled={disabled} aria-label={`Remove ${file.name}`}
                    onClick={() => { onChange(files.filter((_, i) => i !== index)); setError(""); }}
                    className="absolute top-1 right-1 rounded-full bg-white/95 p-1 text-slate-600 shadow-sm hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
                    <X className="size-4" aria-hidden="true" />
                  </button>
                  {file === cover && <span className="absolute bottom-1 left-1 rounded bg-blue-600 px-1 py-0.5 text-xs font-medium text-white">Cover</span>}
                </div>
              ) : (
                <button type="button" disabled={disabled} aria-label={`Add media in slot ${index + 1}`}
                  onClick={() => input.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-blue-500 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
                  <Plus className="size-6" aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="space-y-1 text-xs leading-5 text-slate-500">
        <p>JPEG, PNG, WebP up to 10 MB. MP4, MOV, WebM up to 100 MB.</p>
        <p>The first image becomes the cover photo. Select a slot or drop files to add media.</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  );
};
