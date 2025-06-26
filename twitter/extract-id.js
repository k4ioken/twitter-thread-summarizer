function extractTweetId(url) {
  try {
    const parts = url.trim().replace(/\/+$/, '').split('/');
    const last = parts[parts.length - 1];
    return /^\d+$/.test(last) ? last : null; // return string if it's all digits
  } catch {
    return null;
  }
}

module.exports = extractTweetId;
