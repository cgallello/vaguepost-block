export function nextStrike(record, postId, threshold) {
  const prior = record || { strikes: 0, processedPostIds: [] };
  if ((prior.processedPostIds || []).includes(postId)) return { ...prior, duplicate: true, thresholdReached: prior.strikes > threshold };
  const strikes = Number(prior.strikes || 0) + 1;
  return { ...prior, strikes, processedPostIds: [...(prior.processedPostIds || []), postId].slice(-100), duplicate: false, thresholdReached: strikes > threshold };
}
