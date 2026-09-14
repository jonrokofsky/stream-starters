import { DATASET_CATALOG } from "./catalog.ts";
import type { SnapshotStore } from "./storage.ts";
import type { DatasetKey, RefreshResult } from "./types.ts";

export const MLB_SEASON_2026 = {
  startsOn: "2026-03-25",
  endsOn: "2026-10-31",
} as const;

export const SCHEDULED_MLB_DATASETS = [
  "mlb_pitchers",
  "mlb_team_offense",
] as const satisfies readonly DatasetKey[];

type ScheduledMlbDataset = (typeof SCHEDULED_MLB_DATASETS)[number];

export type ScheduledMlbEvidence = {
  invokedAt: string;
  datasetKeys: readonly ScheduledMlbDataset[];
  inSeason: boolean;
  status: "skipped" | "ready" | "partial_failure" | "failed";
  reason?: "outside_mlb_season";
  results?: Array<{
    datasetKey: ScheduledMlbDataset;
    state: RefreshResult["state"];
    error?: string;
  }>;
};

type ScheduleDependencies = {
  now: () => Date;
  createStore: () => SnapshotStore;
  refresh: (key: DatasetKey, store: SnapshotStore) => Promise<RefreshResult>;
  recordEvidence: (evidence: ScheduledMlbEvidence) => void;
};

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function isCronAuthorized(
  authorization: string | null,
  secret: string | undefined,
) {
  if (!secret || !authorization) return false;
  return constantTimeEqual(authorization, `Bearer ${secret}`);
}

export function isMlbSeason(date: Date) {
  if (!Number.isFinite(date.getTime())) return false;
  const utcDate = date.toISOString().slice(0, 10);
  return (
    utcDate >= MLB_SEASON_2026.startsOn && utcDate <= MLB_SEASON_2026.endsOn
  );
}

function scheduledFailure(key: ScheduledMlbDataset): RefreshResult {
  return {
    datasetKey: key,
    state: "failed",
    metadata: null,
    message: `${DATASET_CATALOG[key].label}: scheduled refresh could not be completed.`,
    failureStage: "storage",
  };
}

export async function handleScheduledMlbRequest(
  authorization: string | null,
  secret: string | undefined,
  dependencies: ScheduleDependencies,
) {
  if (!isCronAuthorized(authorization, secret)) {
    return { httpStatus: 401, body: { error: "Unauthorized." } } as const;
  }

  const now = dependencies.now();
  const invokedAt = now.toISOString();
  if (!isMlbSeason(now)) {
    const evidence: ScheduledMlbEvidence = {
      invokedAt,
      datasetKeys: SCHEDULED_MLB_DATASETS,
      inSeason: false,
      status: "skipped",
      reason: "outside_mlb_season",
    };
    dependencies.recordEvidence(evidence);
    return {
      httpStatus: 200,
      body: {
        status: "skipped",
        reason: "outside_mlb_season",
        datasetKeys: SCHEDULED_MLB_DATASETS,
        invokedAt,
      },
    } as const;
  }

  const results = await Promise.all(
    SCHEDULED_MLB_DATASETS.map(async (key) => {
      try {
        return await dependencies.refresh(key, dependencies.createStore());
      } catch {
        return scheduledFailure(key);
      }
    }),
  );
  const failedCount = results.filter((result) => result.state === "failed").length;
  const status = failedCount === 0
    ? "ready"
    : failedCount === results.length
      ? "failed"
      : "partial_failure";
  dependencies.recordEvidence({
    invokedAt,
    datasetKeys: SCHEDULED_MLB_DATASETS,
    inSeason: true,
    status,
    results: results.map((result) => ({
      datasetKey: result.datasetKey as ScheduledMlbDataset,
      state: result.state,
      error: result.state === "failed" ? result.message : undefined,
    })),
  });
  return {
    httpStatus: status === "failed" ? 502 : status === "partial_failure" ? 207 : 200,
    body: { status, results, invokedAt, inSeason: true },
  } as const;
}

// Keep the original exports available for compatibility with existing imports.
export const isMlbPitcherSeason = isMlbSeason;
export const handleScheduledPitcherRequest = handleScheduledMlbRequest;
