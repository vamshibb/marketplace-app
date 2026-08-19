export const successResponse = <T>(
  data: T,
  message?: string
) => ({
  success: true,
  message,
  data,
});
