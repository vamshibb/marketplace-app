const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const videoTypes = ["video/mp4", "video/quicktime", "video/webm"];
export const mediaAccept = [...imageTypes, ...videoTypes].join(",");

export const validateMediaFiles = (incoming: File[], selectedCount: number): string => {
  if (selectedCount + incoming.length > 10) return "Choose up to 10 photos and videos.";
  for (const file of incoming) {
    const image = imageTypes.includes(file.type);
    if (!image && !videoTypes.includes(file.type)) return "Choose JPEG, PNG, WebP, MP4, MOV or WebM files.";
    if (file.size > (image ? 10 : 100) * 1024 * 1024) {
      return image ? "Images must be 10 MB or smaller." : "Videos must be 100 MB or smaller.";
    }
  }
  return "";
};
