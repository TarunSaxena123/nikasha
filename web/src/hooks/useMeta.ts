"use client";
// /v1/meta is fetched once per tab and held in the store (feature 07 design §1.5).
import { useCallback } from "react";
import { getMeta } from "@/api/client";
import { useStore } from "@/store";
import type { InstrumentSummary } from "@/api/types";
import type { DateState } from "@/legal/disclaimer";

let inflight: Promise<void> | null = null;

export function loadMeta(force = false): Promise<void> {
  const { meta, set } = useStore.getState();
  if (!force && (meta.status === "ready" || inflight)) return inflight ?? Promise.resolve();
  set({ meta: { status: "loading", data: meta.data } });
  inflight = getMeta()
    .then((data) => set({ meta: { status: "ready", data } }))
    .catch(() => set({ meta: { status: "error", data: null } }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useMeta() {
  const meta = useStore((s) => s.meta);
  const reload = useCallback(() => loadMeta(true), []);
  const inst: InstrumentSummary | undefined = meta.data?.instruments[0];
  const dates: DateState =
    meta.status === "ready" && inst
      ? { first: inst.data_range.first, last: inst.data_range.last }
      : meta.status === "error"
        ? "unavailable"
        : "loading";
  return { status: meta.status, data: meta.data, inst, dates, reload };
}
