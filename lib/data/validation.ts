import { DataIngestionError } from "./errors.ts";
import type { CanonicalRow, DatasetDefinition } from "./types.ts";

const TEAM_ALIASES: Record<string, string> = { AZ: "ARI", JAC: "JAX", LA: "LAR", OAK: "LV", SD: "LAC" };
function normalizeText(value: string) { return value.trim().replace(/\s+/g, " "); }
function normalizeTeam(value: string, definition: DatasetDefinition) {
  const upper = value.toUpperCase();
  const mlbMultiTeam = definition.key.startsWith("mlb_")
    ? /^(\d+)\s+TMS$/i.exec(value)
    : null;
  if (mlbMultiTeam) return `${mlbMultiTeam[1]} Tms`;
  return TEAM_ALIASES[upper] ?? upper;
}
function normalizeNumber(value: string | number | null) {
  if (value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  const normalized = value.trim().replace(/[$,]/g, "");
  const percent = normalized.endsWith("%");
  const parsed = Number(percent ? normalized.slice(0, -1) : normalized);
  return Number.isFinite(parsed) ? (percent ? parsed / 100 : parsed) : Number.NaN;
}

export function normalizeCanonicalRows(definition: DatasetDefinition, input: CanonicalRow[]) {
  for (const field of definition.requiredFields) {
    if (!input.some((row) => Object.hasOwn(row, field))) {
      throw new DataIngestionError(
        definition.key,
        "transform",
        `${definition.label}: required field ${field} is missing.`,
        "FIELD_MISSING",
      );
    }
  }
  return input.map((source) => {
    const row: CanonicalRow = {};
    for (const field of definition.requiredFields) {
      const raw = source[field] ?? null;
      if (definition.numericFields.includes(field)) row[field] = normalizeNumber(raw);
      else if (typeof raw === "string") {
        const text = normalizeText(raw);
        row[field] = field === "Team" || field === "Acronym"
          ? normalizeTeam(text, definition)
          : text;
      } else row[field] = raw;
    }
    for (const [field, value] of Object.entries(source)) {
      if (!(field in row) && !field.startsWith("Unnamed")) row[field] = typeof value === "string" ? normalizeText(value) : value;
    }
    return row;
  });
}

export function validateCanonicalRows(definition: DatasetDefinition, rows: CanonicalRow[]) {
  if (rows.length < definition.minimumRows) throw new DataIngestionError(definition.key, "validation", `${definition.label}: received ${rows.length} usable rows; at least ${definition.minimumRows} are required.`, "ROW_COUNT_LOW");
  const identities = new Set<string>();
  rows.forEach((row, index) => {
    for (const field of definition.requiredFields) if (!Object.hasOwn(row, field)) throw new DataIngestionError(definition.key, "validation", `${definition.label}: required field ${field} is missing.`, "FIELD_MISSING");
    const rawIdentity = row[definition.identityField];
    const identity = typeof rawIdentity === "string"
      ? definition.key === "mlb_pitchers"
        ? rawIdentity.trim()
        : rawIdentity.trim().toLocaleLowerCase("en-US")
      : "";
    if (!identity) throw new DataIngestionError(definition.key, "validation", `${definition.label}: row ${index + 1} has a blank ${definition.identityField}.`, "IDENTITY_BLANK");
    if (identities.has(identity)) throw new DataIngestionError(definition.key, "validation", `${definition.label}: duplicate ${definition.identityField} ${String(rawIdentity)}.`, "IDENTITY_DUPLICATE");
    identities.add(identity);
    for (const field of definition.numericFields) {
      const value = row[field];
      if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) throw new DataIngestionError(definition.key, "validation", `${definition.label}: ${field} contains an invalid number at row ${index + 1}.`, "NUMBER_INVALID");
    }
  });
  return rows;
}
