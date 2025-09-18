// Helper function to create properly typed ByteBotdUser
function _createTypedUser(partial: Partial<ByteBotdUser>): ByteBotdUser {
  const baseUser: ByteBotdUser = {
    sub: (partial.sub as string) ?? (partial.id as string) ?? '',
    id: (partial.id as string) ?? '',
    email: (partial.email as string) ?? 'test@bytebot.ai',
    username: (partial.username as string) ?? 'testuser',
    role: (partial.role as UserRole) ?? UserRole._VIEWER,
    permissions: (partial.permissions as Permission[]) ?? [],
    isActive: (partial.isActive as boolean) ?? true,
  };
  return { ...baseUser, ...partial } as ByteBotdUser;
}