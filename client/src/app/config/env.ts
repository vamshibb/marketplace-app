export type AppEnv = Readonly<{
  apiBaseUrl: string;
}>;

const requireEnvVariable = (name: string, value: unknown): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `Missing required environment variable "${name}". Add it to your Vite environment configuration.`,
    );
  }

  return value.trim();
};

export const env: AppEnv = Object.freeze({
  apiBaseUrl: requireEnvVariable("VITE_API_URL", import.meta.env.VITE_API_URL),
});
