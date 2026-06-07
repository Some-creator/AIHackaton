export const MIN_PRIORITY_SCORE = 5;

export function meetsPriorityThreshold(lead) {
  const priority = Number(lead?.priorityScore);
  if (!Number.isFinite(priority)) return true;
  return priority >= MIN_PRIORITY_SCORE;
}

export function sortLeadsByPriority(leads) {
  return [...leads]
    .filter(meetsPriorityThreshold)
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
}
