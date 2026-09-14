"use client";

import { useCallback, useEffect, useState } from "react";
import { DATASET_CATALOG } from "../../lib/data/catalog";
import type { DatasetKey, DatasetStatus, RefreshResult } from "../../lib/data/types";
import { DATASET_KEYS } from "../../lib/data/types";
import styles from "./hq.module.css";

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Not available";
}

export default function DataOperations() {
  const [datasets, setDatasets] = useState<DatasetStatus[]>([]);
  const [busy, setBusy] = useState<DatasetKey | "all" | null>(null);
  const [message, setMessage] = useState("Loading dataset status…");

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/hq/data/status", { cache: "no-store" });
      const body = (await response.json()) as { datasets?: DatasetStatus[]; error?: string };
      if (!response.ok || !body.datasets) throw new Error(body.error ?? "Dataset status is unavailable.");
      setDatasets(body.datasets);
      setMessage("Dataset status is current.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dataset status is unavailable.");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadStatus(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadStatus]);

  async function refresh(datasetKey: DatasetKey | "all") {
    setBusy(datasetKey);
    setMessage(datasetKey === "all" ? "Refreshing all datasets…" : `Refreshing ${DATASET_CATALOG[datasetKey].label}…`);
    try {
      const response = await fetch("/api/hq/data/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ datasetKey }),
      });
      const body = (await response.json()) as { results?: RefreshResult[]; error?: string };
      if (!body.results) throw new Error(body.error ?? "Refresh could not be completed.");
      setMessage(body.results.map((result) => result.message).join(" "));
      await loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Refresh could not be completed.");
    } finally {
      setBusy(null);
    }
  }

  const byKey = new Map(datasets.map((dataset) => [dataset.datasetKey, dataset]));
  return (
    <section className={styles.dataPanel} aria-labelledby="data-operations-title">
      <div className={styles.dataPanelHeading}>
        <div>
          <p className={styles.eyebrow}>DATA OPERATIONS</p>
          <h2 id="data-operations-title">Stream Starters datasets</h2>
          <p>Pitcher data refreshes daily during the MLB season. You can also refresh manually; every dataset keeps its last good snapshot if an update fails.</p>
        </div>
        <button type="button" onClick={() => void refresh("all")} disabled={busy !== null} aria-busy={busy === "all"}>
          {busy === "all" ? "Refreshing all…" : "Refresh all"}
        </button>
      </div>
      <p className={styles.dataMessage} role="status" aria-live="polite">{message}</p>
      <div className={styles.datasetGrid}>
        {DATASET_KEYS.map((key) => {
          const status = byKey.get(key);
          const state = busy === key ? "refreshing" : (status?.state ?? "never_loaded");
          return (
            <article className={styles.datasetCard} key={key}>
              <div className={styles.datasetTitle}>
                <h3>{DATASET_CATALOG[key].label}</h3>
                <span data-state={state}>{state.replace("_", " ")}</span>
              </div>
              <dl>
                <div><dt>Last good refresh</dt><dd>{formatDate(status?.updatedAt ?? null)}</dd></div>
                <div><dt>Source time</dt><dd>{formatDate(status?.sourceTimestamp ?? null)}</dd></div>
                <div><dt>Rows</dt><dd>{status?.rowCount?.toLocaleString() ?? "—"}</dd></div>
                <div><dt>Schema</dt><dd>v{status?.schemaVersion ?? DATASET_CATALOG[key].schemaVersion}</dd></div>
              </dl>
              <button type="button" onClick={() => void refresh(key)} disabled={busy !== null} aria-busy={busy === key} aria-label={`Refresh ${DATASET_CATALOG[key].label}`}>
                {busy === key ? "Refreshing…" : "Refresh dataset"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
