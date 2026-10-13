import { Play } from "lucide-react";
import { useEffect, useRef } from "react";

export const LocalMediaPreview = ({ file }: { file: File }) => {
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
      <video ref={videoRef} playsInline preload="metadata" aria-label={file.name} className="h-full w-full object-cover" />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Play className="size-8 rounded-full bg-slate-900/70 p-2 text-white" aria-hidden="true" />
        <span className="sr-only">Video</span>
      </span>
    </>
  ) : (
    <img ref={imageRef} alt={file.name} className="h-full w-full object-cover" />
  );
};
