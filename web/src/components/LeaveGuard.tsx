"use client";
// Warns before closing or refreshing while a draft, a running evaluation or a report exists (REQ-EVL-10).
import { useEffect } from "react";
import { useStore } from "@/store";

export function LeaveGuard() {
  const active = useStore((s) => s.draft !== null || s.evaluation.status === "running" || s.evaluation.status === "done");
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
  return null;
}
