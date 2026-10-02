export type RankingOrderItem = {
  playerName: string;
  currentElo: number;
};

export type ReRankedItem = {
  playerName: string;
  elo: number;
};

export function moveRankingItem<T extends { playerName: string }>(
  items: readonly T[],
  sourcePlayerName: string,
  targetPlayerName: string
): T[] {
  const sourceIndex = items.findIndex((item) => item.playerName === sourcePlayerName);
  const targetIndex = items.findIndex((item) => item.playerName === targetPlayerName);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return [...items];
  }

  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function buildRerankedRatings(
  items: readonly RankingOrderItem[]
): ReRankedItem[] {
  if (!items.length) return [];

  const currentElos = items.map((item) => item.currentElo);
  const maxElo = Math.max(...currentElos);
  const minElo = Math.min(...currentElos);
  const range = Math.max(items.length - 1, maxElo - minElo, 10);
  const step = items.length > 1 ? range / (items.length - 1) : 0;

  return items.map((item, index) => ({
    playerName: item.playerName,
    elo: Math.round(maxElo - step * index),
  }));
}
