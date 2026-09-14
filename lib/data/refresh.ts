import { UnconfiguredAdapter } from "./adapters.ts";
import { DATASET_CATALOG } from "./catalog.ts";
import { checksumRows } from "./checksum.ts";
import { DataIngestionError, safeErrorMessage } from "./errors.ts";
import { FanGraphsPitcherAdapter } from "./fangraphsPitchers.ts";
import { FanGraphsTeamOffenseAdapter } from "./fangraphsTeamOffense.ts";
import type { SnapshotStore } from "./storage.ts";
import type { DatasetAdapter, DatasetKey, DatasetSnapshot, RefreshResult } from "./types.ts";
import { normalizeCanonicalRows, validateCanonicalRows } from "./validation.ts";

export function defaultAdapterFor(key: DatasetKey): DatasetAdapter {
  if (key === "mlb_pitchers") return new FanGraphsPitcherAdapter();
  if (key === "mlb_team_offense") return new FanGraphsTeamOffenseAdapter();
  return new UnconfiguredAdapter(key);
}

export async function refreshDataset(key: DatasetKey, store: SnapshotStore, adapter: DatasetAdapter = defaultAdapterFor(key)): Promise<RefreshResult> {
  let acquired: boolean;
  try {
    acquired = await store.tryAcquireRefresh(key);
  } catch (error) {
    return {
      datasetKey: key,
      state: "failed",
      metadata: null,
      message: safeErrorMessage(error, key),
      failureStage: error instanceof DataIngestionError ? error.stage : "storage",
    };
  }
  if (!acquired) return { datasetKey: key, state: "failed", metadata: null, message: `${DATASET_CATALOG[key].label}: a refresh is already running.` };

  let result: RefreshResult;
  try {
    const definition = DATASET_CATALOG[key];
    const output = await adapter.load(AbortSignal.timeout(20_000));
    const rows = validateCanonicalRows(definition, normalizeCanonicalRows(definition, output.rows));
    const checksum = await checksumRows(rows);
    const current = await store.getActive(key);
    if (current?.checksum === checksum) {
      result = { datasetKey: key, state: "unchanged", metadata: current, message: `${definition.label}: data is already current.` };
    } else {
      const snapshot: DatasetSnapshot = { id: crypto.randomUUID(), datasetKey: key, schemaVersion: definition.schemaVersion, sourceLabel: output.sourceLabel, sourceTimestamp: output.sourceTimestamp ?? null, ingestedAt: new Date().toISOString(), rowCount: rows.length, checksum, sourceDetails: output.sourceDetails ?? {}, rows };
      await store.stage(snapshot);
      try { await store.activate(snapshot.id); }
      catch { throw new DataIngestionError(key, "activation", `${definition.label}: validated data was staged but could not be activated. The previous data remains active.`, "ACTIVATION_FAILED"); }
      result = { datasetKey: key, state: "ready", metadata: snapshot, message: `${definition.label}: refreshed ${rows.length} rows.` };
    }
  } catch (error) {
    result = { datasetKey: key, state: "failed", metadata: null, message: safeErrorMessage(error, key), failureStage: error instanceof DataIngestionError ? error.stage : "storage" };
  }
  try { await store.finishRefresh(result); }
  catch (error) {
    if (result.state !== "failed") result = { datasetKey: key, state: "failed", metadata: result.metadata, message: safeErrorMessage(error, key) };
  }
  return result;
}
