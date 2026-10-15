// Where each page's Back link leads (REQ-BEG-19; frontend.md §2.1). Routes in the flow, not browser history.
import type { StepId } from "@/strategy/completeness";

export interface Back {
  href: string;
  label: string;
}

const INTRO: Back = { href: "/", label: "intro" };
const CHOOSE: Back = { href: "/start", label: "Choose a path" };

export const BACK: Record<string, Back> = {
  "/start": INTRO,
  "/templates": CHOOSE,
  "/upload": CHOOSE,
  "/report": { href: "/review", label: "review" },
  "/learn": INTRO,
  "/disclaimer": INTRO,
};

export const ARTICLE_BACK: Back = { href: "/learn", label: "Learn" };

const STEP_ORDER: StepId[] = ["basics", "strike", "entry", "exit", "advanced"];
const STEP_LABEL: Record<StepId, string> = {
  basics: "Basics",
  strike: "Strike",
  entry: "Entry",
  exit: "Exit",
  advanced: "Advanced options",
};

/** Builder: the previous step (first step → Choose a path); review when the builder was opened from it. */
export function builderBack(step: StepId, fromReview: boolean): Back {
  if (fromReview) return { href: "/review", label: "review" };
  const i = STEP_ORDER.indexOf(step);
  if (i <= 0) return CHOOSE;
  const prev = STEP_ORDER[i - 1]!;
  return { href: `/build?step=${prev}`, label: STEP_LABEL[prev] };
}

/** Review: back to where the strategy came from. */
export function reviewBack(origin: "TEMPLATE" | "BUILDER" | "UPLOAD" | undefined): Back {
  if (origin === "TEMPLATE") return { href: "/templates", label: "templates" };
  if (origin === "UPLOAD") return { href: "/upload", label: "upload" };
  return { href: "/build?step=exit", label: "the builder" };
}
