import "dotenv/config";

const getRequiredVariable = (
  name: "JWT_SECRET" | "AZURE_STORAGE_CONNECTION_STRING"
): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
};

export const env = Object.freeze({
  PORT: process.env.PORT || 5000,
  JWT_SECRET: getRequiredVariable("JWT_SECRET"),
  AZURE_STORAGE_CONNECTION_STRING: getRequiredVariable(
    "AZURE_STORAGE_CONNECTION_STRING"
  ),
});
