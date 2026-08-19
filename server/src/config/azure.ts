import { BlobServiceClient } from "@azure/storage-blob";
import { env } from "./env";

export const blobServiceClient =
  BlobServiceClient.fromConnectionString(
    env.AZURE_STORAGE_CONNECTION_STRING
  );