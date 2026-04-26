export function computeScore(totalPieceCost, attempts, completionTimeSeconds) {
  return Math.max(0, Math.round(10000 - totalPieceCost * 50 - attempts * 500 - completionTimeSeconds * 20));
}
