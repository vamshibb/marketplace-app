export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

export interface UserSummary {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthSession {
  token: string;
  user: UserSummary;
}
