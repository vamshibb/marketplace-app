export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface UserSummary {
  id: string;
  email: string;
}

export interface AuthSession {
  token: string;
  user: UserSummary;
}
