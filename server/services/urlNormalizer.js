function normalizeSourceUrl(url) {
  if (typeof url !== "string") return url;

  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  return withScheme.replace(/\/+$/, "");
}

module.exports = {
  normalizeSourceUrl,
};
