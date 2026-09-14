import type { DatasetKey, RefreshStage } from "./types.ts";

export class DataIngestionError extends Error {
  constructor(readonly datasetKey: DatasetKey, readonly stage: RefreshStage, message: string, readonly code: string) {
    super(message);
    this.name = "DataIngestionError";
  }
}

export function safeErrorMessage(error: unknown, datasetKey: DatasetKey) {
  if (error instanceof DataIngestionError) return error.message;
  return `${datasetKey}: refresh failed. Check the server configuration and try again.`;
}
