import type { NextRequest } from "next/server";
import { isDatasetKey } from "../../../../../lib/data/catalog";
import { refreshDataset } from "../../../../../lib/data/refresh";
import {
  hasHqSession,
  isSameOrigin,
} from "../../../../../lib/data/requestSecurity";
import { SupabaseSnapshotStore } from "../../../../../lib/data/supabaseSnapshotStore";
import { DATASET_KEYS } from "../../../../../lib/data/types";

export async function POST(request: NextRequest) {
  if (!(await hasHqSession(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isSameOrigin(request)) {
    return Response.json(
      { error: "Refresh requests must come from Stream Starters HQ." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid refresh request." }, { status: 400 });
  }

  const selected = (body as { datasetKey?: unknown }).datasetKey;
  const keys =
    selected === "all"
      ? DATASET_KEYS
      : typeof selected === "string" && isDatasetKey(selected)
        ? [selected]
        : null;
  if (!keys) {
    return Response.json(
      { error: "Choose a valid dataset or all datasets." },
      { status: 400 },
    );
  }

  const store = new SupabaseSnapshotStore();
  const results = await Promise.all(
    keys.map((key) => refreshDataset(key, store)),
  );
  return Response.json(
    { results },
    { status: results.some((result) => result.state === "failed") ? 207 : 200 },
  );
}
