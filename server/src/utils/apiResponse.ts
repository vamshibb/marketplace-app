export const successResponse = (
  data: any,
  message?: string
) => {
  return {
    success: true,
    message,
    data,
  };
};