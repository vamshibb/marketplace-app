import { MediaType } from "../generated/prisma";

export const MEDIA_FIELD_NAME = "media";

export const MEDIA_CONTAINERS = {
  [MediaType.IMAGE]: "product-images",
  [MediaType.VIDEO]: "product-images",
} as const;

export const getContainerByMediaType = (
  mediaType: MediaType
) => {
  return MEDIA_CONTAINERS[mediaType];
};

export const MEDIA_LIMITS = {
  MAX_FILES: 10,
  MAX_IMAGE_SIZE: 10 * 1024 * 1024,
  MAX_VIDEO_SIZE: 100 * 1024 * 1024,
};

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
];
