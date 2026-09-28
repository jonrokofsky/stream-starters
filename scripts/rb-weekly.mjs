export function upsertWeeklySnapshot(archive, result, source) {
  const week = Math.max(...result.rows.map((row) => Number(row.G) || 0));
  if (!Number.isInteger(week) || week < 1 || week > 22) {
    throw new Error(`Invalid RB snapshot week: ${week}`);
  }
  if (archive.season !== 2026 || !Array.isArray(archive.weeks)) {
    throw new Error("Invalid weekly RB archive");
  }
  const existing = archive.weeks.find((item) => item.week === week);
  if (existing && JSON.stringify(existing.rows) === JSON.stringify(result.rows)) {
    return { archive, changed: false, week };
  }
  const snapshot = { week, copiedAt: result.copiedAt, rows: result.rows };
  return {
    changed: true,
    week,
    archive: {
      season: 2026,
      source,
      weeks: [...archive.weeks.filter((item) => item.week !== week), snapshot]
        .sort((a, b) => a.week - b.week),
    },
  };
}
