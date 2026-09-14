import type {
  DatasetKey,
  DatasetSnapshot,
  DatasetStatus,
  RefreshResult,
} from "./types.ts";

export interface SnapshotStore {
  getActive(key: DatasetKey): Promise<DatasetSnapshot | null>;
  listStatuses(): Promise<DatasetStatus[]>;
  tryAcquireRefresh(key: DatasetKey): Promise<boolean>;
  stage(snapshot: DatasetSnapshot): Promise<void>;
  activate(snapshotId: string): Promise<void>;
  finishRefresh(result: RefreshResult): Promise<void>;
}

export class MemorySnapshotStore implements SnapshotStore {
  static readonly REFRESH_LEASE_MS = 5 * 60 * 1000;
  private readonly snapshots = new Map<string, DatasetSnapshot>();
  private readonly active = new Map<DatasetKey, string>();
  private readonly locks = new Map<DatasetKey, number>();
  private readonly results = new Map<DatasetKey, RefreshResult>();

  constructor(private readonly now: () => number = Date.now) {}

  async getActive(key: DatasetKey) {
    const id = this.active.get(key);
    return id ? structuredClone(this.snapshots.get(id) ?? null) : null;
  }

  async listStatuses() {
    const { DATASET_KEYS } = await import("./types");
    const { DATASET_CATALOG } = await import("./catalog");
    return DATASET_KEYS.map((key) => {
      const activeId = this.active.get(key);
      const snapshot = activeId ? this.snapshots.get(activeId) : null;
      const result = this.results.get(key);
      return {
        datasetKey: key,
        state: this.isLocked(key)
          ? "refreshing"
          : (result?.state ?? (snapshot ? "ready" : "never_loaded")),
        sourceLabel: snapshot?.sourceLabel ?? null,
        sourceTimestamp: snapshot?.sourceTimestamp ?? null,
        updatedAt: snapshot?.ingestedAt ?? null,
        rowCount: snapshot?.rowCount ?? null,
        schemaVersion: snapshot?.schemaVersion ?? DATASET_CATALOG[key].schemaVersion,
        message: result?.message ?? null,
      } satisfies DatasetStatus;
    });
  }

  async tryAcquireRefresh(key: DatasetKey) {
    if (this.isLocked(key)) return false;
    this.locks.set(key, this.now());
    return true;
  }

  private isLocked(key: DatasetKey) {
    const startedAt = this.locks.get(key);
    if (startedAt === undefined) return false;
    if (this.now() - startedAt < MemorySnapshotStore.REFRESH_LEASE_MS) return true;
    this.locks.delete(key);
    return false;
  }

  async stage(snapshot: DatasetSnapshot) {
    this.snapshots.set(snapshot.id, structuredClone(snapshot));
  }

  async activate(snapshotId: string) {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) throw new Error("Staged snapshot was not found.");
    this.active.set(snapshot.datasetKey, snapshotId);
  }

  async finishRefresh(result: RefreshResult) {
    this.locks.delete(result.datasetKey);
    this.results.set(result.datasetKey, structuredClone(result));
  }
}
