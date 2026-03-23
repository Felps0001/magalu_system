function normalizeIdMagalu(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

function getAllowedFeedPublisherIds() {
  const rawValue = typeof process.env.FEED_ALLOWED_PUBLISHER_IDS === 'string'
    ? process.env.FEED_ALLOWED_PUBLISHER_IDS
    : '';

  return new Set(
    rawValue
      .split(',')
      .map((item) => normalizeIdMagalu(item))
      .filter(Boolean)
  );
}

function canPublishToFeed(userOrIdMagalu) {
  const idMagalu = typeof userOrIdMagalu === 'string'
    ? userOrIdMagalu
    : userOrIdMagalu && typeof userOrIdMagalu.id_magalu === 'string'
      ? userOrIdMagalu.id_magalu
      : '';

  const normalizedIdMagalu = normalizeIdMagalu(idMagalu);

  if (!normalizedIdMagalu) {
    return false;
  }

  return getAllowedFeedPublisherIds().has(normalizedIdMagalu);
}

module.exports = {
  canPublishToFeed,
};