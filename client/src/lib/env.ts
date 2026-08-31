function getRequiredUrl(name: "VITE_API_URL", value: string | undefined) {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`Environment variable ${name} must be a valid URL.`);
  }
}

export const env = Object.freeze({
  API_URL: getRequiredUrl("VITE_API_URL", import.meta.env.VITE_API_URL),
});
