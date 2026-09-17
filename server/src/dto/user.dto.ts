export interface UserSummary {
  id: string;
  email: string;
  displayName: string | null;
}

export const toUserSummary = (user: UserSummary): UserSummary => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
});
