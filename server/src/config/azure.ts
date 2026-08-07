import { BlobServiceClient } from "@azure/storage-blob";

const connectionString =
  process.env.AZURE_STORAGE_CONNECTION_STRING;

if (!connectionString) {
  throw new Error(
    "AZURE_STORAGE_CONNECTION_STRING is not configured."
  );
}

export const blobServiceClient =
  BlobServiceClient.fromConnectionString(
    connectionString
  );

export const containerName =
  process.env.AZURE_STORAGE_CONTAINER_NAME ||
  "product-images";

export const containerClient =
  blobServiceClient.getContainerClient(
    containerName
  );