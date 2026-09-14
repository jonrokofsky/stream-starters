export const DATASET_KEYS = [
  "mlb_pitchers",
  "mlb_team_offense",
  "mlb_hitters",
  "mlb_hitter_rank_pool",
  "nfl_running_backs",
  "nfl_defense_by_position",
] as const;

export type DatasetKey = (typeof DATASET_KEYS)[number];
export type CanonicalValue = string | number | null;
export type CanonicalRow = Record<string, CanonicalValue>;
export type DatasetState = "ready" | "refreshing" | "unchanged" | "failed" | "never_loaded";
export type RefreshStage = "fetch" | "transform" | "validation" | "storage" | "activation";

export type DatasetDefinition = {
  key: DatasetKey;
  label: string;
  schemaVersion: number;
  identityField: string;
  minimumRows: number;
  requiredFields: readonly string[];
  numericFields: readonly string[];
  adapter: string;
};

export type SnapshotMetadata = {
  id: string;
  datasetKey: DatasetKey;
  schemaVersion: number;
  sourceLabel: string;
  sourceTimestamp: string | null;
  ingestedAt: string;
  rowCount: number;
  checksum: string;
  sourceDetails: Record<string, unknown>;
};

export type DatasetSnapshot = SnapshotMetadata & { rows: CanonicalRow[] };

export type DatasetStatus = {
  datasetKey: DatasetKey;
  state: DatasetState;
  sourceLabel: string | null;
  sourceTimestamp: string | null;
  updatedAt: string | null;
  rowCount: number | null;
  schemaVersion: number;
  message: string | null;
};

export type AdapterOutput = {
  rows: CanonicalRow[];
  sourceLabel: string;
  sourceTimestamp?: string | null;
  sourceDetails?: Record<string, unknown>;
};

export interface DatasetAdapter {
  readonly key: DatasetKey;
  load(signal: AbortSignal): Promise<AdapterOutput>;
}

export type RefreshResult = {
  datasetKey: DatasetKey;
  state: "ready" | "unchanged" | "failed";
  metadata: SnapshotMetadata | null;
  message: string;
  failureStage?: RefreshStage;
};
