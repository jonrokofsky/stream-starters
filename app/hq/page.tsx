"use client";

import Link from "next/link";
import { useState } from "react";
import DataOperations from "./data-operations";
import {
  resolveDemoActivities,
  safeActivitySummary,
  type AgentActivity,
  type AgentName,
} from "./activity";
import styles from "./hq.module.css";

type AgentProfile = {
  role: string;
  tagline: string;
  artifact: string;
  message: string;
  nextOwner: string;
  color: string;
};

type Handoff = {
  agent: AgentName;
  from: string;
  request: string;
  to: string;
  response: string;
};

const agents: Record<AgentName, AgentProfile> = {
  Architect: {
    role: "Product & systems design",
    tagline: "Make the expected behavior explicit.",
    artifact: "specs/empty-state.md",
    message:
      "A first-time visitor should see a clear empty state. AC-2 makes that behavior testable.",
    nextOwner: "Coder · implement the spec",
    color: "#68c5dc",
  },
  Coder: {
    role: "Implementation & fixes",
    tagline: "Accepted. Small fix, then a retest.",
    artifact: "reviews/empty-state-build.md",
    message:
      "I can add the empty state without changing the ranking logic. I’ll answer the issue and hand it back for a retest.",
    nextOwner: "Tester · verify the change",
    color: "#e6b96c",
  },
  Tester: {
    role: "Independent review",
    tagline: "One edge case before we ship.",
    artifact: "reviews/empty-state-qa.md",
    message:
      "The normal path works. What does a new user see when there are no rankings yet?",
    nextOwner: "Coder · address I-001",
    color: "#df8ca1",
  },
  Manager: {
    role: "Coordination & final review",
    tagline: "Evidence first. Then your decision.",
    artifact: "reviews/empty-state-manager.md",
    message:
      "I’ll check the spec, build, and QA together. A SHIP recommendation comes to you for acceptance.",
    nextOwner: "You · final acceptance",
    color: "#ae9ad8",
  },
};

const handoffs: Handoff[] = [
  {
    agent: "Architect",
    from: "Manager → Architect",
    request: "Define the first-visit experience.",
    to: "Architect → Coder",
    response: "Spec ready: empty results need a clear message.",
  },
  {
    agent: "Coder",
    from: "Architect → Coder",
    request: "AC-1 and AC-2 are ready to build.",
    to: "Coder → Tester",
    response: "Build ready. Normal rankings view checked.",
  },
  {
    agent: "Tester",
    from: "Coder → Tester",
    request: "Build ready. Normal rankings view checked.",
    to: "Tester → Coder · BLOCKING",
    response: "AC-2: empty results show a blank screen.",
  },
  {
    agent: "Coder",
    from: "Tester → Coder · I-001",
    request: "Empty-state acceptance criterion failed.",
    to: "Coder → Tester · ACCEPT",
    response: "Empty-state branch fixed. Ready for retest.",
  },
  {
    agent: "Tester",
    from: "Coder → Tester",
    request: "Updated build includes the empty state.",
    to: "Tester → Manager · RETEST PASS",
    response: "Empty and populated results checked. I-001 closed.",
  },
  {
    agent: "Manager",
    from: "Tester → Manager",
    request: "Required checks pass on the revised build.",
    to: "Manager → You · SHIP",
    response: "Ready for your acceptance. Nothing has been published.",
  },
];

const agentOrder = Object.keys(agents) as AgentName[];

function PixelPerson({ name, active }: { name: AgentName; active: boolean }) {
  return (
    <div
      className={`${styles.person} ${active ? styles.personActive : ""}`}
      style={{ "--agent-color": agents[name].color } as React.CSSProperties}
      aria-hidden="true"
    >
      <span className={styles.hair} />
      <span className={styles.face} />
      <span className={styles.body} />
      <span className={styles.legs} />
    </div>
  );
}

function ActivityBubble({ activity, selected }: { activity: AgentActivity; selected: boolean }) {
  const summary = safeActivitySummary(activity.summary);

  return (
    <div
      className={`${styles.activityBubble} ${selected ? styles.selectedActivityBubble : ""}`}
      data-state={activity.state}
      style={{ "--agent-color": agents[activity.agent].color } as React.CSSProperties}
      role="status"
      aria-label={`${activity.agent} status: ${activity.state}. ${summary}`}
      title={`${activity.agent} · ${activity.state}: ${summary}`}
    >
      <span className={styles.activityState}>{activity.state}</span>
      <span className={styles.activitySummary}>{summary}</span>
    </div>
  );
}

function Workstation({ name, active, activity }: { name: AgentName; active: boolean; activity: AgentActivity }) {
  return (
    <div className={styles.station}>
      <ActivityBubble activity={activity} selected={active} />
      <div className={styles.monitor}>
        <span style={{ backgroundColor: agents[name].color }} />
        <span />
        <span />
      </div>
      <div className={styles.desk} />
      <PixelPerson name={name} active={active} />
      <div className={styles.nameplate}>{name}</div>
    </div>
  );
}

export default function AgentHqPage() {
  const [selected, setSelected] = useState<AgentName>("Tester");
  const [step, setStep] = useState(2);
  const [paused, setPaused] = useState(false);

  const profile = agents[selected];
  const handoff = handoffs[step];
  const activities = resolveDemoActivities(handoff.agent, paused);

  function selectAgent(name: AgentName) {
    setSelected(name);
  }

  function nextHandoff() {
    const next = (step + 1) % handoffs.length;
    setStep(next);
    setSelected(handoffs[next].agent);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Stream Starters home">
          <span className={styles.logo}>SS</span>
          <span>STREAM STARTERS</span>
          <span className={styles.slash}>/ HQ</span>
        </Link>
        <span className={styles.demoBadge}>VISUAL PROTOTYPE · SAMPLE ACTIVITY</span>
        <form action="/api/hq-logout" method="post">
          <button type="submit" className={styles.signOut}>Sign out</button>
        </form>
      </header>

      <div className={styles.shell}>
        <section className={styles.workspace}>
          <div className={styles.titleRow}>
            <div>
              <p className={styles.eyebrow}>THE TEAM ROOM</p>
              <h1>Good work has a little back-and-forth.</h1>
            </div>
            <span className={styles.sessionState}>
              {paused ? "Ⅱ Demo paused" : "● Demo session"}
            </span>
          </div>

          <div className={styles.room}>
            <div className={styles.window}><span /><span /><span /></div>
            <div className={styles.board}>
              <span>SPEC</span><span>BUILD</span><span>QA</span>
            </div>
            <div className={styles.window}><span /><span /><span /></div>
            <div className={styles.plantLeft}>✦</div>
            <div className={styles.plantRight}>✦</div>
            <div className={styles.stations}>
              {agentOrder.map((name) => (
                <Workstation
                  key={name}
                  name={name}
                  active={selected === name}
                  activity={activities[name]}
                />
              ))}
            </div>
          </div>

          <div className={styles.agentTabs} aria-label="Select an agent">
            {agentOrder.map((name) => (
              <button
                key={name}
                type="button"
                className={selected === name ? styles.selectedTab : ""}
                aria-pressed={selected === name}
                onClick={() => selectAgent(name)}
              >
                {name}
                <span>{agents[name].role.split(" & ")[0]}</span>
                <span className={styles.srOnly}>
                  {activities[name].state}: {safeActivitySummary(activities[name].summary)}
                </span>
              </button>
            ))}
          </div>

          <div className={styles.taskLine}>
            <span>EXAMPLE TASK</span>
            <strong>Hitter rankings · empty state</strong>
          </div>
          <div className={styles.flow}>
            Architect → Coder ↔ Tester → Manager → You
            <span>{step + 1}/{handoffs.length}</span>
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={nextHandoff} disabled={paused}>
              {step === handoffs.length - 1 ? "Replay example ↻" : "Next handoff →"}
            </button>
            <button type="button" className={styles.secondary} onClick={() => setPaused(!paused)}>
              {paused ? "Resume demo" : "Pause demo"}
            </button>
          </div>
          <DataOperations />
        </section>

        <aside className={styles.sidebar} aria-live="polite">
          <p className={styles.eyebrow}>AT THE WORKSTATION</p>
          <div className={styles.agentHeading}>
            <span style={{ backgroundColor: profile.color }}>{selected[0]}</span>
            <div><h2>{selected}</h2><p>{profile.role}</p></div>
          </div>
          <div className={styles.detailMessage}>{profile.message}</div>

          <p className={styles.label}>SHARED ARTIFACT</p>
          <code className={styles.artifact}>{profile.artifact}</code>

          <p className={styles.label}>TEAM CONVERSATION</p>
          <div className={styles.log}>
            <div><small>{handoff.from}</small>{handoff.request}</div>
            <div><small>{handoff.to}</small>{handoff.response}</div>
          </div>

          <p className={styles.label}>NEXT OWNER</p>
          <p className={styles.owner}>{profile.nextOwner}</p>
        </aside>
      </div>

      <footer className={styles.footer}>
        <span>SHARED ARTIFACTS · REAL DISCUSSION · YOUR FINAL SAY</span>
        <span>{paused ? "Demo checkpoint held" : "Sample data · no live agents connected"}</span>
      </footer>
    </main>
  );
}
