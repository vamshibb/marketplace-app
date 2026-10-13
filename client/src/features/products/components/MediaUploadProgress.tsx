export const MediaUploadProgress = ({ percent }: { percent: number | null }) => (
  <div className="space-y-1 text-xs text-slate-500" role="status">
    <p>{percent === null ? "Uploading media..." : percent === 100 ? "Upload sent. Processing media..." : `Uploading media: ${percent}%`}</p>
    <progress aria-label="Media upload progress" max={100} value={percent ?? undefined} className="h-1.5 w-full accent-blue-600" />
  </div>
);
