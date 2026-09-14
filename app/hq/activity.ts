export type AgentName = "Architect" | "Coder" | "Tester" | "Manager";

export type AgentActivity = {
  agent: AgentName;
  state: "idle" | "working" | "waiting" | "blocked" | "done";
  summary: string;
  source: "hq" | "session" | "data-operation" | "live-event";
  taskId?: string;
  artifact?: string;
  updatedAt?: string;
};

const MAX_SUMMARY_LENGTH = 72;

export function safeActivitySummary(summary: string) {
  const normalized = summary.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return "No live update";
  return normalized.length > MAX_SUMMARY_LENGTH
    ? `${normalized.slice(0, MAX_SUMMARY_LENGTH - 1).trimEnd()}…`
    : normalized;
}

export function resolveDemoActivities(
  activeAgent: AgentName,
  paused: boolean,
): Record<AgentName, AgentActivity> {
  const names: AgentName[] = ["Architect", "Coder", "Tester", "Manager"];

  return Object.fromEntries(
    names.map((agent) => {
      if (paused) {
        return [agent, { agent, state: "waiting", summary: "DEMO · Paused", source: "hq" }];
      }

      if (agent === activeAgent) {
        return [agent, { agent, state: "working", summary: "SAMPLE · Current handoff", source: "hq" }];
      }

      return [agent, { agent, state: "idle", summary: "Waiting for a task", source: "hq" }];
    }),
  ) as Record<AgentName, AgentActivity>;
}
