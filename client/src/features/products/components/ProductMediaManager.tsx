import { MediaUploadProgress } from "./MediaUploadProgress";
import { MediaGrid, mediaTileClass } from "./MediaGrid";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { RefreshCw, X } from "lucide-react";
import { useRef, useState } from "react";
import type { useProductMediaMutation } from "../hooks/useProductMediaMutation";
import type { ProductMedia } from "../types";
import { mediaAccept, validateMediaFiles } from "../utils/mediaFiles";
import { LocalMediaPreview } from "./LocalMediaPreview";
import { SortableProductMedia } from "./SortableProductMedia";

interface Props {
  media: ProductMedia[];
  mutation: ReturnType<typeof useProductMediaMutation>;
  disabled: boolean;
}

export const ProductMediaManager = ({ media, mutation, disabled }: Props) => {
  const replacementInput = useRef<HTMLInputElement>(null);
  const replacementTarget = useRef<string | null>(null);
  const [replacementFile, setReplacementFile] = useState<{ mediaId: string; file: File; mediaIds: string[] } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [draftOrder, setDraftOrder] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const saved = [...media].sort((a, b) => a.sortOrder - b.sortOrder);
  const ordered = draftOrder
    ? [...draftOrder.flatMap(id => saved.find(item => item.id === id) ?? []), ...saved.filter(item => !draftOrder.includes(item.id))]
    : saved;
  const changed = ordered.some((item, index) => item.id !== saved[index]?.id);
  // A refresh may reveal files saved despite a lost upload response. Keep the
  // selected files for recovery without rendering more than ten occupied slots.
  const visibleFiles = files.slice(0, Math.max(0, 10 - ordered.length));
  const cover = ordered.find(item => item.mediaType === "IMAGE")?.id;
  const locked = disabled || mutation.isPending;
  const controlsLocked = locked || dragging || mutation.recovery;
  const addFiles = (incoming: File[]) => {
    if (controlsLocked) return;
    const error = validateMediaFiles(incoming, media.length + files.length);
    setFileError(error);
    if (!error) setFiles(current => [...current, ...incoming]);
  };
  const actionClass = "text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed";

  return <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-slate-900">Photos &amp; video</h2>
      <button type="button" aria-label="Refresh media" title="Refresh media" disabled={locked || dragging}
        onClick={() => mutation.run({ type: "refresh" }, () => { setDraftOrder(null); setFileError(""); })}
        className="rounded p-1 text-slate-500 hover:text-blue-600 disabled:opacity-50">
        <RefreshCw className="size-4" aria-hidden="true" />
      </button>
    </div>
    <input ref={input} type="file" multiple accept={mediaAccept} disabled={controlsLocked}
      className="hidden" aria-label="Choose photos and videos"
      onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    <input ref={replacementInput} type="file" accept={mediaAccept} disabled={controlsLocked}
      className="hidden" aria-label="Choose replacement media" onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !replacementTarget.current) return;
        const error = validateMediaFiles([file], 0);
        setFileError(error);
        if (error) return;
        const selection = { mediaId: replacementTarget.current, file, mediaIds: ordered.map(item => item.id) };
        setReplacementFile(selection);
        mutation.run({ type: "replace", ...selection }, () => { setReplacementFile(null); setDraftOrder(null); });
      }} />
    <DragDropProvider onDragStart={() => setDragging(true)} onDragEnd={event => {
      setDragging(false);
      if (!locked && !event.canceled) setDraftOrder(move(ordered.map(item => item.id), event));
    }}>
      <MediaGrid label="Listing media" occupied={ordered.length + visibleFiles.length} disabled={controlsLocked}
        onAdd={() => input.current?.click()} onFiles={addFiles}>
        {ordered.map((item, index) => <SortableProductMedia key={item.id} item={item} index={index}
          cover={item.id === cover} disabled={locked || mutation.recovery} removingDisabled={controlsLocked}
          onCover={() => mutation.run({ type: "reorder", mediaIds: [item.id, ...ordered.filter(other => other.id !== item.id).map(other => other.id)] }, () => setDraftOrder(null))}
          onReplace={() => {
            if (media.length + files.length >= 10) {
              setFileError("Replacement needs a free slot to keep the original safe. Remove a different item or an unuploaded selection first.");
              return;
            }
            replacementTarget.current = item.id;
            replacementInput.current?.click();
          }}
          onRemove={() => {
            if (window.confirm("Remove this media from the listing?")) mutation.run({ type: "remove", mediaId: item.id }, () => setFileError(""));
          }} />)}
        {visibleFiles.map((file, index) => <li key={index} className={mediaTileClass}>
          <div className="absolute inset-0 overflow-hidden rounded-lg"><LocalMediaPreview file={file} /></div>
          <span className="absolute bottom-1 left-1 rounded bg-slate-700 px-1 py-0.5 text-xs text-white">New</span>
          <button type="button" aria-label={`Remove ${file.name}`} disabled={controlsLocked}
            onClick={() => { setFiles(current => current.filter((_, i) => i !== index)); setFileError(""); }}
            className="absolute top-1 right-1 rounded-full bg-white/95 p-1 text-slate-600 shadow-sm hover:text-red-600 disabled:opacity-50">
            <X className="size-4" aria-hidden="true" />
          </button>
        </li>)}
      </MediaGrid>
    </DragDropProvider>
    {(changed || files.length > 0) && <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {changed && <>
        <button type="button" className={actionClass} disabled={controlsLocked}
          onClick={() => mutation.run({ type: "reorder", mediaIds: ordered.map(item => item.id) }, () => setDraftOrder(null))}>Save order</button>
        <button type="button" className={actionClass} disabled={controlsLocked} onClick={() => setDraftOrder(null)}>Discard order</button>
      </>}
      {files.length > 0 && <button type="button" className={actionClass} disabled={locked || dragging || Boolean(replacementFile)}
        onClick={() => mutation.run({ type: "upload", files }, () => { setFiles([]); setFileError(""); })}>Upload {files.length} {files.length === 1 ? "file" : "files"}</button>}
    </div>}
    <div className="space-y-1 text-xs leading-5 text-slate-500">
      <p>JPEG, PNG, WebP up to 10 MB. MP4, MOV, WebM up to 100 MB.</p>
      <p>Drag to reorder. Media saves separately.</p>
    </div>
    {mutation.recoveryMessage && <p className="text-xs text-slate-500">{mutation.recoveryMessage}</p>}
    {files.length > visibleFiles.length && <p className="text-xs text-slate-500">{files.length} selected files retained for recovery.</p>}
    {mutation.recovery && <div className="flex flex-wrap gap-3">
      <button type="button" className={actionClass} disabled={locked || dragging}
        onClick={() => replacementFile
          ? mutation.run({ type: "replace", ...replacementFile }, () => { setReplacementFile(null); setDraftOrder(null); })
          : mutation.run({ type: "upload", files }, () => { setFiles([]); setFileError(""); })}>Retry media</button>
      {mutation.canKeepRefreshed && <button type="button" className={actionClass} disabled={locked}
        onClick={() => { mutation.keepRefreshed(); setFiles([]); setReplacementFile(null); setDraftOrder(null); setFileError(""); }}>Keep refreshed media</button>}
    </div>}
    {mutation.uploading && <MediaUploadProgress percent={mutation.uploadProgress} />}
    {mutation.isPending && !mutation.uploading && <p role="status" className="text-sm text-slate-500">{mutation.action === "refresh" ? "Refreshing media..." : "Saving media..."}</p>}
    {mutation.isSuccess && !mutation.isPending && <p role="status" className="text-xs text-slate-500">{mutation.action === "refresh" ? "Media refreshed." : "Media updated."}</p>}
    {(fileError || mutation.errorMessage) && <p role="alert" className="text-sm text-red-600">{mutation.errorMessage || fileError}</p>}
  </section>;
};
