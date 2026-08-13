import { MediaType, Prisma, ProductMedia } from "../generated/prisma";

export interface ProductMediaDto {
  id: string;
  url: string;
  mediaType: MediaType;
  sortOrder: number;
}

export const toProductMediaDto = (
  media: ProductMedia
): ProductMediaDto => ({
  id: media.id,
  url: media.url,
  mediaType: media.mediaType,
  sortOrder: media.sortOrder,
});