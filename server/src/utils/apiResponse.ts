export interface ApiResponse<T> {
  success: true;
  message?: string;
  data: T;
}

export const successResponse = <T>(
  data: T,
  message?: string
): ApiResponse<T> => ({
  success: true,
  message,
  data,
});