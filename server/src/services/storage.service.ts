import { BlockBlobClient } from "@azure/storage-blob";
import { randomUUID } from "crypto";
import path from "path";
import "multer";

import { containerClient } from "../config/azure";

export const uploadImage = async (
  file: Express.Multer.File
): Promise<string> => {
  const extension = path.extname(file.originalname);

  const fileName =
    `${randomUUID()}${extension}`;

  const blockBlobClient: BlockBlobClient =
    containerClient.getBlockBlobClient(
      fileName
    );

  await blockBlobClient.uploadData(
    file.buffer,
    {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
      },
    }
  );

  return blockBlobClient.url;
};