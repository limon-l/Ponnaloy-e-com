function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    avatarUrl: user.avatarUrl || "",
    isAdmin: Boolean(user.isAdmin),
    createdAt: user.createdAt,
  };
}

module.exports = { sanitizeUser };
