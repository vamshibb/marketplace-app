import { api } from "../../../shared/api/axios";
import type { ApiResponse } from "../../../shared/types/api";
import type {
  AuthSession,
  LoginRequest,
  RegisterRequest,
  UserSummary,
} from "../types";

export const login = async (request: LoginRequest): Promise<AuthSession> => {
  const response = await api.post<ApiResponse<AuthSession>>(
    "/auth/login",
    request,
  );

  return response.data.data;
};

export const register = async (
  request: RegisterRequest,
): Promise<AuthSession> => {
  const response = await api.post<ApiResponse<AuthSession>>(
    "/auth/register",
    request,
  );

  return response.data.data;
};

export const getCurrentUser = async (): Promise<UserSummary> => {
  const response = await api.get<ApiResponse<UserSummary>>("/auth/me");

  return response.data.data;
};
