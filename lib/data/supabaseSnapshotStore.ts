import { supabaseAdmin } from "../supabaseAdmin.ts";
import { DATASET_CATALOG } from "./catalog.ts";
import { DataIngestionError } from "./errors.ts";
import type {
  CanonicalRow,
  DatasetKey,
  DatasetSnapshot,
  DatasetState,
  DatasetStatus,
  RefreshResult,
} from "./types.ts";
import type { SnapshotStore } from "./storage.ts";

type SnapshotRecord = {
  id: string;
  dataset_key: DatasetKey;
  schema_version: number;
  source_label: string;
  source_timestamp: string | null;
  ingested_at: string;
  row_count: number;
  checksum: string;
  payload: CanonicalRow[];
  source_details: Record<string, unknown>;
};

const REFRESH_LEASE_SECONDS = 5 * 60;

function fromRecord(record: SnapshotRecord): DatasetSnapshot {
  return {
    id: record.id,
    datasetKey: record.dataset_key,
    schemaVersion: record.schema_version,
    sourceLabel: record.source_label,
    sourceTimestamp: record.source_timestamp,
    ingestedAt: record.ingested_at,
    rowCount: record.row_count,
    checksum: record.checksum,
    sourceDetails: record.source_details ?? {},
    rows: record.payload,
  };
}

export class SupabaseSnapshotStore implements SnapshotStore {
  async getActive(key: DatasetKey) {
    const { data, error } = await supabaseAdmin
      .from("dataset_active_snapshots")
      .select("dataset_snapshots(*)")
      .eq("dataset_key", key)
      .maybeSingle();
    if (error) throw new DataIngestionError(key, "storage", `${DATASET_CATALOG[key].label}: stored data is unavailable. Apply the data snapshot migration and try again.`, "STORAGE_READ_FAILED");
    const joined = (data as unknown as { dataset_snapshots: SnapshotRecord | SnapshotRecord[] | null } | null)?.dataset_snapshots;
    const record = Array.isArray(joined) ? joined[0] : joined;
    return record ? fromRecord(record) : null;
  }

  async listStatuses() {
    return Promise.all(
      (Object.keys(DATASET_CATALOG) as DatasetKey[]).map(async (key) => {
        const [snapshot, run] = await Promise.all([
          this.getActive(key),
          supabaseAdmin.from("dataset_refresh_runs").select("status,error_summary,started_at").eq("dataset_key", key).order("started_at", { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (run.error) throw new DataIngestionError(key, "storage", `${DATASET_CATALOG[key].label}: refresh status is unavailable. Apply the data snapshot migration and try again.`, "STATUS_READ_FAILED");
        const isStale = run.data?.status === "refreshing" && Date.now() - new Date(run.data.started_at).getTime() >= REFRESH_LEASE_SECONDS * 1000;
        const state = isStale ? "failed" : ((run.data?.status as DatasetState | undefined) ?? (snapshot ? "ready" : "never_loaded"));
        return {
          datasetKey: key,
          state,
          sourceLabel: snapshot?.sourceLabel ?? null,
          sourceTimestamp: snapshot?.sourceTimestamp ?? null,
          updatedAt: snapshot?.ingestedAt ?? null,
          rowCount: snapshot?.rowCount ?? null,
          schemaVersion: snapshot?.schemaVersion ?? DATASET_CATALOG[key].schemaVersion,
          message: isStale ? `${DATASET_CATALOG[key].label}: the previous refresh was interrupted. Start it again.` : (run.data?.error_summary ?? null),
        } satisfies DatasetStatus;
      }),
    );
  }

  async tryAcquireRefresh(key: DatasetKey) {
    const { data, error } = await supabaseAdmin.rpc("try_acquire_dataset_refresh", {
      p_dataset_key: key,
      p_lease_seconds: REFRESH_LEASE_SECONDS,
    });
    if (!error) return Boolean(data);
    throw new DataIngestionError(key, "storage", `${DATASET_CATALOG[key].label}: refresh could not be started.`, "REFRESH_LOCK_FAILED");
  }

  async stage(snapshot: DatasetSnapshot) {
    const { error } = await supabaseAdmin.from("dataset_snapshots").insert({ id: snapshot.id, dataset_key: snapshot.datasetKey, schema_version: snapshot.schemaVersion, source_label: snapshot.sourceLabel, source_timestamp: snapshot.sourceTimestamp, ingested_at: snapshot.ingestedAt, row_count: snapshot.rowCount, checksum: snapshot.checksum, source_details: snapshot.sourceDetails, payload: snapshot.rows });
    if (error) throw new DataIngestionError(snapshot.datasetKey, "storage", `${DATASET_CATALOG[snapshot.datasetKey].label}: validated data could not be staged.`, "SNAPSHOT_STAGE_FAILED");
  }

  async activate(snapshotId: string) {
    const { error } = await supabaseAdmin.rpc("activate_dataset_snapshot", { p_snapshot_id: snapshotId });
    if (error) throw new Error("Snapshot activation failed.");
  }

  async finishRefresh(result: RefreshResult) {
    const { error } = await supabaseAdmin.from("dataset_refresh_runs").update({ status: result.state, failure_stage: result.failureStage ?? null, error_summary: result.state === "failed" ? result.message : null, finished_at: new Date().toISOString(), snapshot_id: result.metadata?.id ?? null }).eq("dataset_key", result.datasetKey).eq("status", "refreshing");
    if (error) throw new DataIngestionError(result.datasetKey, "storage", `${DATASET_CATALOG[result.datasetKey].label}: refresh result could not be recorded.`, "REFRESH_FINISH_FAILED");
  }
}
