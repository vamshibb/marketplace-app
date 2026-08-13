import {
  BlockBlobClient,
  ContainerClient,
} from "@azure/storage-blob";
import { randomUUID } from "crypto";
import path from "path";

import { blobServiceClient } from "../config/azure";
import { UploadResult } from "../types/storage";

export const generateBlobName = (
  originalName: string
): string => {
  const extension = path.extname(originalName);

  return `${randomUUID()}${extension}`;
};

export const uploadFile = async (
  file: Express.Multer.File,
  container: string,
  blobName?: string
): Promise<UploadResult> => {
  const finalBlobName =
    blobName ??
    generateBlobName(file.originalname);

  const containerClient: ContainerClient =
    blobServiceClient.getContainerClient(
      container
    );

  const blockBlobClient: BlockBlobClient =
    containerClient.getBlockBlobClient(
      finalBlobName
    );

  await blockBlobClient.uploadData(
    file.buffer,
    {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
      },
    }
  );

  return {
    url: blockBlobClient.url,
    blobName: finalBlobName,
  };
};

export const deleteFile = async (
  blobName: string,
  container: string
): Promise<void> => {
  const containerClient =
    blobServiceClient.getContainerClient(
      container
    );

  const blockBlobClient =
    containerClient.getBlockBlobClient(
      blobName
    );

  await blockBlobClient.deleteIfExists();
};