export const MIN_LEAD_RATING = 5;

export function meetsRatingThreshold(lead) {
  const rating = Number(lead?.rating);
  if (!Number.isFinite(rating)) return true;
  return rating >= MIN_LEAD_RATING;
}

export function sortLeadsByPriority(leads) {
  return [...leads]
    .filter(meetsRatingThreshold)
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
}
