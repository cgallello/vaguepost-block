export function nextStrike(record, postId, threshold) {
  const prior = record || { strikes: 0, processedPostIds: [], dismissedPostIds: [] };
  if ((prior.dismissedPostIds || []).includes(postId)) return { ...prior, duplicate: true, dismissed: true, thresholdReached: prior.strikes > threshold };
  if ((prior.processedPostIds || []).includes(postId)) return { ...prior, duplicate: true, thresholdReached: prior.strikes > threshold };
  const strikes = Number(prior.strikes || 0) + 1;
  return { ...prior, strikes, processedPostIds: [...(prior.processedPostIds || []), postId].slice(-100), duplicate: false, thresholdReached: strikes > threshold };
}

export function dismissStrike(record, postId) {
  const prior = record || { strikes: 0, processedPostIds: [], dismissedPostIds: [] };
  const processedPostIds = prior.processedPostIds || [];
  if (!processedPostIds.includes(postId)) return { ...prior, dismissed: false };
  return { ...prior, strikes: Math.max(0, Number(prior.strikes || 0) - 1), processedPostIds: processedPostIds.filter((id) => id !== postId), dismissedPostIds: [...(prior.dismissedPostIds || []), postId].slice(-100), dismissed: true };
}
