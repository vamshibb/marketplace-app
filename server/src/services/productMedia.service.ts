import * as productMediaRepository from "../repositories/productMedia.repository";
import * as productRepository from "../repositories/product.repository";
import {
  getContainerByMediaType,
  MEDIA_LIMITS,
} from "../constants/media.constants";
import {
  ProductMediaDto,
  toProductMediaDto,
} from "../dto/productMedia.dto";
import { AppError } from "../errors/AppError";
import { MediaType, Prisma } from "../generated/prisma";
import { deleteFile, uploadFile } from "./storage.service";

interface UploadedBlob {
  blobName: string;
  container: string;
}

const validateOwnership = async (
  productId: string,
  userId: string
): Promise<void> => {
  const product = await productRepository.findProductOwner(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (product.sellerId !== userId) {
    throw new AppError("Forbidden", 403);
  }
};

const detectMediaType = (mimeType: string): MediaType => {
  if (mimeType.startsWith("image/")) {
    return MediaType.IMAGE;
  }

  if (mimeType.startsWith("video/")) {
    return MediaType.VIDEO;
  }

  throw new AppError("Unsupported media type", 400);
};

const rollbackUploads = async (
  uploads: UploadedBlob[]
): Promise<void> => {
  await Promise.allSettled(
    uploads.map(({ blobName, container }) =>
      deleteFile(blobName, container)
    )
  );
};

export const uploadMedia = async (
  productId: string,
  files: Express.Multer.File[],
  userId: string
): Promise<ProductMediaDto[]> => {
  await validateOwnership(productId, userId);

  if (!files.length) {
    throw new AppError(
      "At least one media file is required.",
      400
    );
  }

  const startingSortOrder =
    await productMediaRepository.countByProductId(productId);
  const uploadedBlobs: UploadedBlob[] = [];
  const mediaData: Prisma.ProductMediaCreateManyInput[] = [];

  try {
    for (const [index, file] of files.entries()) {
      const mediaType = detectMediaType(file.mimetype);

      if (
        mediaType === MediaType.IMAGE &&
        file.size > MEDIA_LIMITS.MAX_IMAGE_SIZE
      ) {
        throw new AppError("Image exceeds maximum size.", 400);
      }

      if (
        mediaType === MediaType.VIDEO &&
        file.size > MEDIA_LIMITS.MAX_VIDEO_SIZE
      ) {
        throw new AppError("Video exceeds maximum size.", 400);
      }

      const container = getContainerByMediaType(mediaType);
      const uploaded = await uploadFile(file, container);

      uploadedBlobs.push({
        blobName: uploaded.blobName,
        container,
      });
      mediaData.push({
        productId,
        url: uploaded.url,
        blobName: uploaded.blobName,
        mediaType,
        sortOrder: startingSortOrder + index,
      });
    }

    const media = await productMediaRepository.createManyMediaRecords(mediaData);
    return media.map(toProductMediaDto);
  } catch (error) {
    await rollbackUploads(uploadedBlobs);
    throw error;
  }
};

export const createMedia = (
  data: Prisma.ProductMediaUncheckedCreateInput
) => {
  return productMediaRepository.createMedia(data);
};

export const getMediaByProductId = async (
  productId: string
): Promise<ProductMediaDto[]> => {
  const product = await productRepository.findProductOwner(productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const media = await productMediaRepository.findMediaByProductId(
    productId
  );

  return media.map(toProductMediaDto);
};

export const getMediaById = (id: string) => {
  return productMediaRepository.findMediaById(id);
};

export const updateMedia = (
  id: string,
  data: Prisma.ProductMediaUpdateInput
) => {
  return productMediaRepository.updateMedia(
    id,
    data
  );
};

export const deleteMedia = async (
  productId: string,
  mediaId: string,
  userId: string
): Promise<void> => {
  const product = await productRepository.findProductOwner(productId);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const media = await productMediaRepository.findMediaById(mediaId);

  if (!media || media.productId !== productId) {
    throw new AppError("Product media not found", 404);
  }

  if (product.sellerId !== userId) {
    throw new AppError("Forbidden", 403);
  }

  const container = getContainerByMediaType(media.mediaType);

  await deleteFile(media.blobName, container);
  await productMediaRepository.deleteMedia(mediaId);
};

export const reorderMedia = async (
  productId: string,
  mediaIds: string[],
  userId: string
): Promise<void> => {
  await validateOwnership(productId, userId);

  const uniqueMediaIds = new Set(mediaIds);

  if (uniqueMediaIds.size !== mediaIds.length) {
    throw new AppError("Duplicate media IDs are not allowed", 400);
  }

  const productMedia =
    await productMediaRepository.findMediaByProductId(productId);
  const productMediaIds = new Set(
    productMedia.map((media) => media.id)
  );

  if (!mediaIds.every((mediaId) => productMediaIds.has(mediaId))) {
    throw new AppError(
      "One or more media items do not belong to this product",
      400
    );
  }

  if (mediaIds.length !== productMedia.length) {
    throw new AppError(
      "Every product media item must be included",
      400
    );
  }

  await productMediaRepository.updateMediaSortOrders(mediaIds);
};
