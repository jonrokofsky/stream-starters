import { DataIngestionError } from "./errors.ts";
import type {
  AdapterOutput,
  CanonicalRow,
  DatasetAdapter,
  DatasetKey,
} from "./types.ts";

export const MAX_UPSTREAM_BYTES = 5 * 1024 * 1024;
export const UPSTREAM_TIMEOUT_MS = 15_000;

export class UnconfiguredAdapter implements DatasetAdapter {
  constructor(readonly key: DatasetKey) {}

  async load(): Promise<AdapterOutput> {
    throw new DataIngestionError(
      this.key,
      "fetch",
      `${this.key}: source is not configured yet. Record the approved provider and transformation rules, then configure its adapter.`,
      "SOURCE_UNCONFIGURED",
    );
  }
}

export class CanonicalFixtureAdapter implements DatasetAdapter {
  constructor(
    readonly key: DatasetKey,
    private readonly rows: CanonicalRow[],
    private readonly sourceLabel = "fixture",
  ) {}

  async load(): Promise<AdapterOutput> {
    return {
      rows: structuredClone(this.rows),
      sourceLabel: this.sourceLabel,
      sourceTimestamp: null,
    };
  }
}

export async function fetchBoundedText(
  key: DatasetKey,
  url: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetcher(url, {
      signal: combinedSignal,
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) {
      throw new DataIngestionError(
        key,
        "fetch",
        `${key}: provider request failed with status ${response.status}. Try again or check provider access.`,
        "UPSTREAM_FAILED",
      );
    }
    const declaredSize = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredSize) && declaredSize > MAX_UPSTREAM_BYTES) {
      throw new DataIngestionError(
        key,
        "fetch",
        `${key}: provider response exceeded the safe size limit.`,
        "UPSTREAM_TOO_LARGE",
      );
    }
    if (!response.body) return "";
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_UPSTREAM_BYTES) {
        await reader.cancel();
        throw new DataIngestionError(
          key,
          "fetch",
          `${key}: provider response exceeded the safe size limit.`,
          "UPSTREAM_TOO_LARGE",
        );
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(bytes);
  } catch (error) {
    if (error instanceof DataIngestionError) throw error;
    throw new DataIngestionError(
      key,
      "fetch",
      `${key}: provider could not be reached. Check its configuration and try again.`,
      "UPSTREAM_UNAVAILABLE",
    );
  } finally {
    clearTimeout(timeout);
  }
}
