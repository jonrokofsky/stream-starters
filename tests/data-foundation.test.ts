import assert from "node:assert/strict";
import test from "node:test";
import { CanonicalFixtureAdapter, fetchBoundedText, MAX_UPSTREAM_BYTES } from "../lib/data/adapters.ts";
import { DATASET_CATALOG } from "../lib/data/catalog.ts";
import { buildFanGraphsPitcherUrl, FanGraphsPitcherAdapter } from "../lib/data/fangraphsPitchers.ts";
import {
  buildFanGraphsTeamOffenseUrl,
  FanGraphsTeamOffenseAdapter,
  MLB_TEAM_KEYS_2026,
  transformFanGraphsTeamOffense,
  type FanGraphsTeamOffenseMonth,
} from "../lib/data/fangraphsTeamOffense.ts";
import { defaultAdapterFor, refreshDataset } from "../lib/data/refresh.ts";
import {
  handleScheduledMlbRequest,
  isMlbSeason,
  MLB_SEASON_2026,
  SCHEDULED_MLB_DATASETS,
} from "../lib/data/scheduledPitchers.ts";
import { MemorySnapshotStore } from "../lib/data/storage.ts";
import { DATASET_KEYS, type CanonicalRow, type DatasetKey } from "../lib/data/types.ts";
import { normalizeCanonicalRows, validateCanonicalRows } from "../lib/data/validation.ts";

function rowsFor(key: DatasetKey): CanonicalRow[] {
  const definition = DATASET_CATALOG[key];
  return Array.from({ length: definition.minimumRows }, (_, index) =>
    Object.fromEntries(
      definition.requiredFields.map((field) => {
        if (field === definition.identityField) return [field, `Person ${index}`];
        if (field === "Team" || field === "Acronym") return [field, `T${index}`];
        if (field === "Hand") return [field, "R"];
        if (field === "Pos") return [field, "OF"];
        return [field, field.includes("%") ? "12.5%" : "1,234"];
      }),
    ),
  );
}

test("all six catalog fixtures normalize, validate, stage, and activate", async () => {
  for (const key of DATASET_KEYS) {
    const store = new MemorySnapshotStore();
    const result = await refreshDataset(key, store, new CanonicalFixtureAdapter(key, rowsFor(key)));
    assert.equal(result.state, "ready", result.message);
    const active = await store.getActive(key);
    assert.equal(active?.rowCount, DATASET_CATALOG[key].minimumRows);
    assert.equal(typeof active?.rows[0][DATASET_CATALOG[key].numericFields[0]], "number");
  }
});

test("unchanged and invalid refreshes preserve the active snapshot", async () => {
  const key = "mlb_team_offense";
  const store = new MemorySnapshotStore();
  const rows = rowsFor(key);
  const first = await refreshDataset(key, store, new CanonicalFixtureAdapter(key, rows));
  const unchanged = await refreshDataset(key, store, new CanonicalFixtureAdapter(key, rows));
  const invalid = rows.map((row, index) => ({ ...row, Team: index < 2 ? "same" : row.Team }));
  const failed = await refreshDataset(key, store, new CanonicalFixtureAdapter(key, invalid));
  assert.equal(unchanged.state, "unchanged");
  assert.equal(failed.state, "failed");
  assert.equal((await store.getActive(key))?.id, first.metadata?.id);
});

test("validation rejects missing columns, blank and duplicate identities, bad numbers, and undersized data", () => {
  const definition = DATASET_CATALOG.mlb_team_offense;
  const valid = rowsFor(definition.key);
  const cases: CanonicalRow[][] = [
    valid.map((row) => Object.fromEntries(Object.entries(row).filter(([field]) => field !== definition.requiredFields[1]))),
    valid.map((row, index) => ({ ...row, Team: index === 0 ? "" : row.Team })),
    valid.map((row, index) => ({ ...row, Team: index < 2 ? "same" : row.Team })),
    valid.map((row, index) => ({ ...row, [definition.numericFields[0]]: index === 0 ? "bad" : row[definition.numericFields[0]] })),
    valid.slice(0, definition.minimumRows - 1),
  ];
  for (const rows of cases) {
    assert.throws(() => validateCanonicalRows(definition, normalizeCanonicalRows(definition, rows)));
  }
});

test("a concurrent refresh for one dataset is rejected", async () => {
  const key: DatasetKey = "nfl_defense_by_position";
  const store = new MemorySnapshotStore();
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const adapter = { key, async load() { await held; return { rows: rowsFor(key), sourceLabel: "fixture" }; } };
  const first = refreshDataset(key, store, adapter);
  await Promise.resolve();
  const second = await refreshDataset(key, store, new CanonicalFixtureAdapter(key, rowsFor(key)));
  assert.equal(second.state, "failed");
  assert.match(second.message, /already running/i);
  release();
  assert.equal((await first).state, "ready");
});

test("one lock-acquisition failure does not discard other refresh results", async () => {
  const failedKey: DatasetKey = "mlb_pitchers";
  class AcquireFailureStore extends MemorySnapshotStore {
    override async tryAcquireRefresh(key: DatasetKey) {
      if (key === failedKey) throw new Error("database details must stay private");
      return super.tryAcquireRefresh(key);
    }
  }
  const store = new AcquireFailureStore();
  const keys: DatasetKey[] = [failedKey, "mlb_team_offense"];
  const results = await Promise.all(
    keys.map((key) =>
      refreshDataset(key, store, new CanonicalFixtureAdapter(key, rowsFor(key))),
    ),
  );
  assert.equal(results[0].state, "failed");
  assert.match(results[0].message, /mlb_pitchers/);
  assert.doesNotMatch(results[0].message, /database details/);
  assert.equal(results[1].state, "ready");
});

test("an expired lock recovers after refresh completion cannot be recorded", async () => {
  let now = 1_000;
  class FinishOnceFailureStore extends MemorySnapshotStore {
    private shouldFail = true;
    override async finishRefresh(result: Parameters<MemorySnapshotStore["finishRefresh"]>[0]) {
      if (this.shouldFail) {
        this.shouldFail = false;
        throw new Error("transient completion failure");
      }
      return super.finishRefresh(result);
    }
  }
  const key: DatasetKey = "nfl_running_backs";
  const store = new FinishOnceFailureStore(() => now);
  const first = await refreshDataset(
    key,
    store,
    new CanonicalFixtureAdapter(key, rowsFor(key)),
  );
  assert.equal(first.state, "failed");

  now += MemorySnapshotStore.REFRESH_LEASE_MS + 1;
  const recovered = await refreshDataset(
    key,
    store,
    new CanonicalFixtureAdapter(key, rowsFor(key)),
  );
  assert.equal(recovered.state, "unchanged");
});

function fangraphsRow(name: string, overrides: Record<string, unknown> = {}) {
  return {
    PlayerName: name,
    TeamNameAbb: "NYY",
    Throws: "R",
    IP: 100,
    ERA: 3.1,
    SIERA: 3.2,
    "K%": 0.25,
    "BB%": 0.07,
    WHIP: 1.1,
    Strikes: 60,
    Pitches: 100,
    "SwStr%": 0.12,
    sp_stuff: 105,
    ...overrides,
  };
}

function fanGraphsFetcher(season: unknown[], last30: unknown[]) {
  const requests: URL[] = [];
  const fetcher = (async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    requests.push(url);
    const rows = url.searchParams.get("month") === "33" ? season : last30;
    return Response.json({ data: rows });
  }) as typeof fetch;
  return { fetcher, requests };
}

test("FanGraphs pitcher requests share the confirmed query and differ only by month", async () => {
  assert.ok(defaultAdapterFor("mlb_pitchers") instanceof FanGraphsPitcherAdapter);
  assert.equal(DATASET_CATALOG.mlb_pitchers.adapter, "fangraphs");
  const { fetcher, requests } = fanGraphsFetcher([], []);
  await new FanGraphsPitcherAdapter(fetcher).load(AbortSignal.timeout(1_000));
  assert.equal(requests.length, 2);
  const season = buildFanGraphsPitcherUrl(33);
  const last30 = buildFanGraphsPitcherUrl(3);
  assert.equal(requests[0].toString(), season.toString());
  assert.equal(requests[1].toString(), last30.toString());
  season.searchParams.delete("month");
  last30.searchParams.delete("month");
  assert.equal(season.toString(), last30.toString());
  assert.equal(requests[0].searchParams.get("type"), "c,13,6,122,120,121,42,30,31,113,386");
  assert.equal(requests[0].searchParams.get("qual"), "10");
});

test("duplicate trimmed season pitcher identities fail instead of merging", async () => {
  const season = Array.from({ length: 150 }, (_, index) =>
    fangraphsRow(index === 1 ? " Pitcher 0 " : `Pitcher ${index}`),
  );
  const { fetcher } = fanGraphsFetcher(season, []);
  const result = await refreshDataset(
    "mlb_pitchers",
    new MemorySnapshotStore(),
    new FanGraphsPitcherAdapter(fetcher),
  );
  assert.equal(result.state, "failed");
  assert.match(result.message, /duplicate Player Pitcher 0/);
});

test("FanGraphs pitcher mapping uses season master and exact trimmed L30 joins", async () => {
  const season = [
    fangraphsRow("  José O'Neil  ", { TeamNameAbb: "bos", Throws: "L", Strikes: 45, Pitches: 90 }),
    fangraphsRow("Case Name"),
  ];
  const last30 = [
    fangraphsRow("José O'Neil", { ERA: 2.2, Strikes: 20, Pitches: 40, sp_stuff: 111 }),
    fangraphsRow("case name", { ERA: 9.9 }),
    fangraphsRow("L30 Only"),
  ];
  const { fetcher } = fanGraphsFetcher(season, last30);
  const output = await new FanGraphsPitcherAdapter(fetcher).load(AbortSignal.timeout(1_000));
  assert.equal(output.sourceLabel, "FanGraphs");
  assert.equal(output.rows.length, 2);
  assert.deepEqual(output.rows.map((row) => row.Player), ["José O'Neil", "Case Name"]);
  assert.equal(output.rows[0].Team, "bos");
  assert.equal(output.rows[0].Hand, "LHP");
  assert.equal(output.rows[0]["Strike%"], 0.5);
  assert.equal(output.rows[0]["L30 ERA"], 2.2);
  assert.equal(output.rows[0]["L30 Strike%"], 0.5);
  assert.equal(output.rows[0]["L30 Stuff+"], 111);
  assert.equal(output.rows[1]["L30 ERA"], null);
  assert.equal(output.rows[1]["L30 Stuff+"], null);
});

test("FanGraphs MLB multi-team labels survive canonical normalization", async () => {
  const season = [
    fangraphsRow("Multi Team", { TeamNameAbb: " 2 Tms " }),
    fangraphsRow("Single Team", { TeamNameAbb: "bos" }),
  ];
  const { fetcher } = fanGraphsFetcher(season, []);
  const adapterOutput = await new FanGraphsPitcherAdapter(fetcher).load(
    AbortSignal.timeout(1_000),
  );
  const normalized = normalizeCanonicalRows(
    DATASET_CATALOG.mlb_pitchers,
    adapterOutput.rows,
  );
  assert.equal(normalized[0].Team, "2 Tms");
  assert.equal(normalized[1].Team, "BOS");
});

test("FanGraphs invalid Strike denominators become null", async () => {
  const season = [fangraphsRow("Zero", { Pitches: 0 }), fangraphsRow("Missing", { Pitches: undefined }), fangraphsRow("Infinite", { Pitches: "Infinity" })];
  const last30 = season.map((row) => ({ ...row }));
  const { fetcher } = fanGraphsFetcher(season, last30);
  const output = await new FanGraphsPitcherAdapter(fetcher).load(AbortSignal.timeout(1_000));
  for (const row of output.rows) {
    assert.equal(row["Strike%"], null);
    assert.equal(row["L30 Strike%"], null);
  }
});

test("a failed FanGraphs period keeps the previous active pitcher snapshot", async () => {
  const key: DatasetKey = "mlb_pitchers";
  const store = new MemorySnapshotStore();
  const seeded = await refreshDataset(key, store, new CanonicalFixtureAdapter(key, rowsFor(key)));
  const fetcher = (async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    return url.searchParams.get("month") === "3"
      ? new Response("downstream private details", { status: 503 })
      : Response.json({ data: Array.from({ length: 150 }, (_, index) => fangraphsRow(`Pitcher ${index}`)) });
  }) as typeof fetch;
  const failed = await refreshDataset(key, store, new FanGraphsPitcherAdapter(fetcher));
  assert.equal(failed.state, "failed");
  assert.match(failed.message, /last 30 days request failed/i);
  assert.doesNotMatch(failed.message, /private details/);
  assert.equal((await store.getActive(key))?.id, seeded.metadata?.id);
});

test("successful FanGraphs refresh records period counts and fetch times", async () => {
  const season = Array.from({ length: 150 }, (_, index) => fangraphsRow(`Pitcher ${index}`));
  const last30 = season.slice(0, 100);
  const { fetcher } = fanGraphsFetcher(season, last30);
  const result = await refreshDataset("mlb_pitchers", new MemorySnapshotStore(), new FanGraphsPitcherAdapter(fetcher));
  assert.equal(result.state, "ready");
  assert.equal(result.metadata?.sourceLabel, "FanGraphs");
  assert.equal(result.metadata?.rowCount, 150);
  assert.equal((result.metadata?.sourceDetails.season as { rowCount: number }).rowCount, 150);
  assert.equal((result.metadata?.sourceDetails.last30 as { rowCount: number }).rowCount, 100);
  assert.match((result.metadata?.sourceDetails.season as { fetchedAt: string }).fetchedAt, /^\d{4}-/);
  assert.equal(result.metadata?.checksum.length, 64);
});

function teamOffenseRows(
  seed: number,
  teams: readonly string[] = MLB_TEAM_KEYS_2026,
): Record<string, unknown>[] {
  return teams.map((team, index) => ({
    TeamNameAbb: team,
    PlayerName: `Ignore Player ${seed}-${index}`,
    "K%": seed / 100 + index / 10_000,
    "BB%": seed / 200 + index / 20_000,
    "wRC+": seed * 10 + index,
    unrequested: "ignore",
  }));
}

function teamOffenseFetcher(
  reports: Record<FanGraphsTeamOffenseMonth, unknown[]>,
  failingMonth?: FanGraphsTeamOffenseMonth,
) {
  const requests: URL[] = [];
  const fetcher = (async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    requests.push(url);
    const month = Number(url.searchParams.get("month")) as FanGraphsTeamOffenseMonth;
    if (month === failingMonth) {
      return new Response("private upstream detail", { status: 503 });
    }
    return Response.json({ data: reports[month] });
  }) as typeof fetch;
  return { fetcher, requests };
}

test("FanGraphs team offense requests share the confirmed query and differ only by month", async () => {
  assert.ok(defaultAdapterFor("mlb_team_offense") instanceof FanGraphsTeamOffenseAdapter);
  assert.equal(DATASET_CATALOG.mlb_team_offense.adapter, "fangraphs");
  assert.equal(DATASET_CATALOG.mlb_team_offense.minimumRows, 30);
  const reports = {
    3: teamOffenseRows(3),
    13: teamOffenseRows(13),
    14: teamOffenseRows(14),
  };
  const { fetcher, requests } = teamOffenseFetcher(reports);
  await new FanGraphsTeamOffenseAdapter(fetcher).load(AbortSignal.timeout(1_000));
  assert.deepEqual(requests.map((url) => Number(url.searchParams.get("month"))), [3, 13, 14]);
  for (const request of requests) {
    assert.equal(request.searchParams.get("stats"), "bat");
    assert.equal(request.searchParams.get("team"), "0,ts");
    assert.equal(request.searchParams.get("qual"), "0");
    assert.equal(request.searchParams.get("type"), "c,35,34,61");
    assert.equal(request.searchParams.get("season"), "2026");
    assert.equal(request.searchParams.get("season1"), "2026");
    assert.equal(request.searchParams.get("pageitems"), "2000000000");
  }
  const baselines = requests.map((request) => {
    const copy = new URL(request);
    copy.searchParams.delete("month");
    return copy.toString();
  });
  assert.equal(new Set(baselines).size, 1);
  assert.equal(requests[0].toString(), buildFanGraphsTeamOffenseUrl(3).toString());
});

test("FanGraphs team offense uses L30 order, team identity, split mapping, and numeric units", () => {
  const masterOrder = [...MLB_TEAM_KEYS_2026].reverse();
  const last30 = teamOffenseRows(3, masterOrder);
  last30[0] = {
    ...last30[0],
    TeamNameAbb: ` ${masterOrder[0].toLowerCase()} `,
    PlayerName: "This is not the team identity",
    "K%": "25%",
    "BB%": "7.50%",
    "wRC+": "1,234",
  };
  const rows = transformFanGraphsTeamOffense({
    last30,
    versusLeft: teamOffenseRows(13),
    versusRight: teamOffenseRows(14, [...MLB_TEAM_KEYS_2026].reverse()),
  });
  assert.deepEqual(rows.map((row) => row.Team), masterOrder);
  assert.equal(rows.length, 30);
  assert.deepEqual(Object.keys(rows[0]), DATASET_CATALOG.mlb_team_offense.requiredFields);
  assert.equal(rows[0]["K% L30"], 0.25);
  assert.equal(rows[0]["BB% L30"], 0.075);
  assert.equal(rows[0]["wRC+ L30"], 1234);
  assert.equal(rows[0]["K% vL"], 0.13 + 29 / 10_000);
  assert.equal(rows[0]["K% vR"], 0.14);
  assert.equal(Object.hasOwn(rows[0], "PlayerName"), false);
  assert.equal(Object.hasOwn(rows[0], "unrequested"), false);
});

test("FanGraphs team offense rejects invalid team membership in every split", () => {
  const valid = {
    last30: teamOffenseRows(3),
    versusLeft: teamOffenseRows(13),
    versusRight: teamOffenseRows(14),
  };
  const cases = [
    {
      input: { ...valid, last30: valid.last30.slice(0, -1) },
      message: /last 30 days did not contain the exact 30-team MLB set/i,
    },
    {
      input: {
        ...valid,
        versusLeft: valid.versusLeft.map((row, index) =>
          index === 1 ? { ...row, TeamNameAbb: valid.versusLeft[0].TeamNameAbb } : row,
        ),
      },
      message: /versus left-handed pitching returned duplicate team/i,
    },
    {
      input: {
        ...valid,
        versusRight: valid.versusRight.map((row, index) =>
          index === 0 ? { ...row, TeamNameAbb: "UNKNOWN" } : row,
        ),
      },
      message: /versus right-handed pitching contained a blank or unknown team key/i,
    },
  ];
  for (const candidate of cases) {
    assert.throws(() => transformFanGraphsTeamOffense(candidate.input), candidate.message);
  }
});

test("FanGraphs team offense rejects non-finite metrics with split context", () => {
  const versusLeft = teamOffenseRows(13);
  versusLeft[0] = { ...versusLeft[0], "BB%": "Infinity" };
  assert.throws(
    () => transformFanGraphsTeamOffense({
      last30: teamOffenseRows(3),
      versusLeft,
      versusRight: teamOffenseRows(14),
    }),
    /versus left-handed pitching contained an invalid BB% value/i,
  );
});

test("each failed FanGraphs team report preserves the active offense snapshot", async () => {
  const key: DatasetKey = "mlb_team_offense";
  const labels: Record<FanGraphsTeamOffenseMonth, RegExp> = {
    3: /last 30 days request failed/i,
    13: /versus left-handed pitching request failed/i,
    14: /versus right-handed pitching request failed/i,
  };
  for (const failingMonth of [3, 13, 14] as const) {
    const store = new MemorySnapshotStore();
    const seeded = await refreshDataset(key, store, new CanonicalFixtureAdapter(key, rowsFor(key)));
    const { fetcher } = teamOffenseFetcher({
      3: teamOffenseRows(3),
      13: teamOffenseRows(13),
      14: teamOffenseRows(14),
    }, failingMonth);
    const failed = await refreshDataset(key, store, new FanGraphsTeamOffenseAdapter(fetcher));
    assert.equal(failed.state, "failed");
    assert.match(failed.message, labels[failingMonth]);
    assert.doesNotMatch(failed.message, /private upstream detail/);
    assert.equal((await store.getActive(key))?.id, seeded.metadata?.id);
  }
});

test("invalid FanGraphs team-set candidates preserve the active offense snapshot", async () => {
  const key: DatasetKey = "mlb_team_offense";
  for (const failingMonth of [3, 13, 14] as const) {
    const store = new MemorySnapshotStore();
    const seeded = await refreshDataset(key, store, new CanonicalFixtureAdapter(key, rowsFor(key)));
    const reports = {
      3: teamOffenseRows(3),
      13: teamOffenseRows(13),
      14: teamOffenseRows(14),
    };
    reports[failingMonth] = reports[failingMonth].slice(0, -1);
    const { fetcher } = teamOffenseFetcher(reports);
    const failed = await refreshDataset(key, store, new FanGraphsTeamOffenseAdapter(fetcher));
    assert.equal(failed.state, "failed");
    assert.match(failed.message, /exact 30-team MLB set/i);
    assert.equal((await store.getActive(key))?.id, seeded.metadata?.id);
  }
});

test("successful FanGraphs team offense refresh records all report metadata", async () => {
  const { fetcher } = teamOffenseFetcher({
    3: teamOffenseRows(3),
    13: teamOffenseRows(13),
    14: teamOffenseRows(14),
  });
  const result = await refreshDataset(
    "mlb_team_offense",
    new MemorySnapshotStore(),
    new FanGraphsTeamOffenseAdapter(fetcher),
  );
  assert.equal(result.state, "ready");
  assert.equal(result.metadata?.rowCount, 30);
  assert.equal(result.metadata?.sourceLabel, "FanGraphs");
  assert.equal((result.metadata?.sourceDetails.last30 as { month: number }).month, 3);
  assert.equal((result.metadata?.sourceDetails.versusLeft as { month: number }).month, 13);
  assert.equal((result.metadata?.sourceDetails.versusRight as { month: number }).month, 14);
  assert.equal(result.metadata?.checksum.length, 64);
});

test("upstream bodies are canceled as soon as the streaming limit is exceeded", async () => {
  let canceled = false;
  const chunk = new Uint8Array(1024 * 1024);
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(chunk); },
    cancel() { canceled = true; },
  });
  const fetcher = (async () => new Response(body)) as typeof fetch;
  await assert.rejects(
    fetchBoundedText("mlb_pitchers", "https://example.test/data", undefined, fetcher),
    /safe size limit/,
  );
  assert.equal(canceled, true);
  assert.ok(MAX_UPSTREAM_BYTES < 6 * chunk.byteLength);
});

test("scheduled MLB refresh fails closed for missing or invalid cron authorization", async () => {
  let storeCreations = 0;
  let refreshes = 0;
  const secret = "test-cron-secret";
  for (const authorization of [null, "test-cron-secret", "Basic test-cron-secret", "Bearer wrong"]) {
    const response = await handleScheduledMlbRequest(authorization, secret, {
      now: () => new Date("2026-06-01T10:00:00.000Z"),
      createStore: () => { storeCreations += 1; return new MemorySnapshotStore(); },
      refresh: async () => { refreshes += 1; throw new Error("must not run"); },
      recordEvidence: () => { throw new Error("must not record an unauthorized run"); },
    });
    assert.equal(response.httpStatus, 401);
    assert.doesNotMatch(JSON.stringify(response.body), new RegExp(secret));
  }
  const missingSecret = await handleScheduledMlbRequest("Bearer anything", undefined, {
    now: () => new Date("2026-06-01T10:00:00.000Z"),
    createStore: () => { storeCreations += 1; return new MemorySnapshotStore(); },
    refresh: async () => { refreshes += 1; throw new Error("must not run"); },
    recordEvidence: () => { throw new Error("must not record an unauthorized run"); },
  });
  assert.equal(missingSecret.httpStatus, 401);
  assert.equal(storeCreations, 0);
  assert.equal(refreshes, 0);
});

test("MLB season guard is inclusive and deterministic in UTC", () => {
  assert.deepEqual(MLB_SEASON_2026, { startsOn: "2026-03-25", endsOn: "2026-10-31" });
  assert.equal(isMlbSeason(new Date("2026-03-24T23:59:59.999Z")), false);
  assert.equal(isMlbSeason(new Date("2026-03-25T00:00:00.000Z")), true);
  assert.equal(isMlbSeason(new Date("2026-07-15T12:00:00.000Z")), true);
  assert.equal(isMlbSeason(new Date("2026-10-31T23:59:59.999Z")), true);
  assert.equal(isMlbSeason(new Date("2026-11-01T00:00:00.000Z")), false);
});

test("outside-season cron skips before creating storage or calling the refresh service", async () => {
  for (const invokedAt of ["2026-03-24T23:59:59.999Z", "2026-11-01T00:00:00.000Z"]) {
    const evidence: unknown[] = [];
    const response = await handleScheduledMlbRequest("Bearer secret", "secret", {
      now: () => new Date(invokedAt),
      createStore: () => { throw new Error("storage must not be created"); },
      refresh: async () => { throw new Error("refresh must not run"); },
      recordEvidence: (item) => evidence.push(item),
    });
    assert.equal(response.httpStatus, 200);
    assert.equal(response.body.status, "skipped");
    assert.equal(response.body.reason, "outside_mlb_season");
    assert.deepEqual(response.body.datasetKeys, SCHEDULED_MLB_DATASETS);
    assert.equal(evidence.length, 1);
  }
});

test("in-season cron delegates both MLB datasets independently to the shared refresh service", async () => {
  const evidence: unknown[] = [];
  const received: Array<{ key: DatasetKey; store: unknown }> = [];
  const response = await handleScheduledMlbRequest("Bearer secret", "secret", {
    now: () => new Date("2026-03-25T00:00:00.000Z"),
    createStore: () => new MemorySnapshotStore(),
    refresh: async (key, passedStore) => {
      received.push({ key, store: passedStore });
      return { datasetKey: key, state: "unchanged", metadata: null, message: "already current" };
    },
    recordEvidence: (item) => evidence.push(item),
  });
  assert.deepEqual(received.map((item) => item.key), SCHEDULED_MLB_DATASETS);
  assert.notEqual(received[0].store, received[1].store);
  assert.equal(response.httpStatus, 200);
  assert.equal(response.body.status, "ready");
  assert.deepEqual(response.body.results.map((result) => result.datasetKey), SCHEDULED_MLB_DATASETS);
  assert.equal(evidence.length, 1);
  assert.doesNotMatch(JSON.stringify(evidence), /secret/);
});

test("one scheduled MLB dataset failure does not discard the other result", async () => {
  const calls: DatasetKey[] = [];
  const evidence: unknown[] = [];
  const response = await handleScheduledMlbRequest("Bearer secret", "secret", {
    now: () => new Date("2026-07-01T10:00:00.000Z"),
    createStore: () => new MemorySnapshotStore(),
    refresh: async (key) => {
      calls.push(key);
      if (key === "mlb_team_offense") throw new Error("private storage detail");
      return { datasetKey: key, state: "ready", metadata: null, message: "pitchers refreshed" };
    },
    recordEvidence: (item) => evidence.push(item),
  });
  assert.deepEqual(calls, SCHEDULED_MLB_DATASETS);
  assert.equal(response.httpStatus, 207);
  assert.equal(response.body.status, "partial_failure");
  assert.equal(response.body.results[0].state, "ready");
  assert.equal(response.body.results[1].state, "failed");
  assert.match(response.body.results[1].message, /MLB team offense/);
  assert.doesNotMatch(JSON.stringify(response), /private storage detail/);
  assert.doesNotMatch(JSON.stringify(evidence), /private storage detail|secret/);
});
