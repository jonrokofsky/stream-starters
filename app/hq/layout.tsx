import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent HQ | Stream Starters",
  description: "Meet the Stream Starters Architect, Coder, Tester, and Manager.",
};

export default function AgentHqLayout({ children }: LayoutProps<"/hq">) {
  return children;
}
