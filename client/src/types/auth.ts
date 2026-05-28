export type AuthResponse = {
  token: string;

  user: {
    id: string;
    email: string;
  };
};